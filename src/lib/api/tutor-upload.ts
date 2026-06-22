import { File, UploadType } from 'expo-file-system';
import {
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  cacheDirectory,
  EncodingType,
} from 'expo-file-system/legacy';
import { getSession } from '@/lib/auth/storage';
import { TUTOR_BASE_URL } from './tutor-client';

type UploadFolder = 'thumbnail' | 'promo-video' | 'lesson-video' | 'assignment' | 'resource';

const MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10 MB — mirrors web app threshold
const PART_SIZE = 10 * 1024 * 1024;            // 10 MB per part
const MAX_CONCURRENT_PARTS = 3;

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSession();
  return token ? { Cookie: `authjs.session-token=${token}` } : {};
}

// ─── Single-PUT presign ───────────────────────────────────────────────────────

export async function presignUpload(
  folder: UploadFolder,
  fileName: string,
  fileType: string,
  fileSize: number,
  lessonId?: string
): Promise<{ uploadUrl: string; key: string }> {
  const res = await fetch(`${TUTOR_BASE_URL}/api/upload/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ folder, fileName, fileType, fileSize, ...(lessonId ? { lessonId } : {}) }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Presign failed');
  return { uploadUrl: json.data.presignedUrl, key: json.data.fileRef };
}

// ─── Single-PUT upload ────────────────────────────────────────────────────────

export async function uploadFileToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const file = new File(fileUri);
  const task = file.createUploadTask(uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(Math.round((bytesSent / totalBytes) * 100));
    },
  });
  const result = await task.uploadAsync();
  const lowerHeaders = Object.fromEntries(
    Object.entries(result.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  console.log('[upload] status:', result.status, 'ETag:', lowerHeaders['etag'] ?? 'none');
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status}): ${result.body?.slice(0, 200)}`);
  }
}

// ─── Multipart helpers ────────────────────────────────────────────────────────

async function initMultipart(
  folder: UploadFolder,
  fileName: string,
  fileType: string,
  fileSize: number,
  lessonId?: string
): Promise<{ uploadId: string; key: string; fileRef: string }> {
  const res = await fetch(`${TUTOR_BASE_URL}/api/upload/multipart/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ folder, fileName, fileType, fileSize, ...(lessonId ? { lessonId } : {}) }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Multipart init failed');
  return { uploadId: json.data.uploadId, key: json.data.key, fileRef: json.data.fileRef };
}

async function presignParts(
  key: string,
  uploadId: string,
  partNumbers: number[]
): Promise<Record<number, string>> {
  const res = await fetch(`${TUTOR_BASE_URL}/api/upload/multipart/presign-parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ key, uploadId, partNumbers }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Presign parts failed');
  return json.data.presignedUrls;
}

async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { PartNumber: number; ETag: string }[]
): Promise<string> {
  const res = await fetch(`${TUTOR_BASE_URL}/api/upload/multipart/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ key, uploadId, parts }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Multipart complete failed');
  return json.data.fileRef;
}

async function abortMultipart(key: string, uploadId: string): Promise<void> {
  try {
    await fetch(`${TUTOR_BASE_URL}/api/upload/multipart/abort`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ key, uploadId }),
    });
  } catch { /* best-effort — don't block the error path */ }
}

// ─── Multipart orchestrator ───────────────────────────────────────────────────
// Each part is uploaded by:
//   1. Reading the byte range from disk as base64 (legacy FileSystem API,
//      position+length only work with base64 encoding)
//   2. Writing the decoded bytes to a cache temp file
//   3. Uploading the temp file via UploadTask (binary, with ETag from headers)
//   4. Deleting the temp file
//
// This avoids the RN BlobManager limitation where blobs cannot be created
// from ArrayBuffer/ArrayBufferView (which is what File.slice() returns).

async function doMultipartUpload(
  folder: UploadFolder,
  fileName: string,
  fileUri: string,
  contentType: string,
  fileSize: number,
  lessonId?: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  console.log('[multipart] init — parts:', Math.ceil(fileSize / PART_SIZE));
  const { uploadId, key } = await initMultipart(folder, fileName, contentType, fileSize, lessonId);

  const numParts = Math.ceil(fileSize / PART_SIZE);
  const partNumbers = Array.from({ length: numParts }, (_, i) => i + 1);

  // Presign all parts in one API call (same as web)
  const presignedUrls = await presignParts(key, uploadId, partNumbers);

  const partProgress = new Array<number>(numParts).fill(0);
  const uploadedParts: { PartNumber: number; ETag: string }[] = [];

  function reportProgress() {
    const avg = partProgress.reduce((sum, p) => sum + p, 0) / numParts;
    onProgress?.(Math.round(avg * 100));
  }

  try {
    for (let i = 0; i < numParts; i += MAX_CONCURRENT_PARTS) {
      const batch = partNumbers.slice(i, i + MAX_CONCURRENT_PARTS);

      await Promise.all(
        batch.map(async (partNum) => {
          const start = (partNum - 1) * PART_SIZE;
          const partSize = Math.min(PART_SIZE, fileSize - start);
          const tempUri = `${cacheDirectory}upload-part-${uploadId}-${partNum}.bin`;

          // Read chunk as base64 from source file (position+length require base64)
          const base64 = await readAsStringAsync(fileUri, {
            encoding: EncodingType.Base64,
            position: start,
            length: partSize,
          });

          // Write decoded bytes to a temp file so UploadTask can stream it
          await writeAsStringAsync(tempUri, base64, { encoding: EncodingType.Base64 });

          try {
            const tempFile = new File(tempUri);
            const task = tempFile.createUploadTask(presignedUrls[partNum], {
              httpMethod: 'PUT',
              uploadType: UploadType.BINARY_CONTENT,
              headers: { 'Content-Type': contentType },
              onProgress: ({ bytesSent, totalBytes }) => {
                if (totalBytes > 0) {
                  partProgress[partNum - 1] = bytesSent / totalBytes;
                  reportProgress();
                }
              },
            });
            const result = await task.uploadAsync();

            if (result.status < 200 || result.status >= 300) {
              throw new Error(`Part ${partNum} upload failed (${result.status})`);
            }

            const lowerHeaders = Object.fromEntries(
              Object.entries(result.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
            );
            const etag = lowerHeaders['etag'];
            if (!etag) {
              throw new Error(
                `Part ${partNum} returned no ETag. ` +
                'Ensure S3 CORS config includes ExposeHeaders: ["ETag"].'
              );
            }

            uploadedParts.push({ PartNumber: partNum, ETag: etag });
            partProgress[partNum - 1] = 1;
            reportProgress();
          } finally {
            // Always clean up temp file — even if the upload fails
            await deleteAsync(tempUri, { idempotent: true });
          }
        })
      );
    }

    // S3 requires parts in ascending PartNumber order for assembly
    const sorted = [...uploadedParts].sort((a, b) => a.PartNumber - b.PartNumber);
    const fileRef = await completeMultipart(key, uploadId, sorted);
    onProgress?.(100);
    console.log('[multipart] complete — fileRef:', fileRef);
    return fileRef;
  } catch (err) {
    // Abort so S3 discards uploaded parts immediately rather than waiting
    // for the lifecycle rule (avoids orphaned storage costs)
    await abortMultipart(key, uploadId);
    throw err;
  }
}

// ─── Unified video upload ─────────────────────────────────────────────────────
// < 10 MB  → single PUT via UploadTask (byte-accurate progress, no temp files)
// ≥ 10 MB  → multipart (10 MB parts, 3 concurrent) — mirrors web app logic

export async function uploadVideo(
  folder: 'promo-video' | 'lesson-video',
  fileName: string,
  fileUri: string,
  contentType: string,
  fileSize: number,
  lessonId?: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (fileSize >= MULTIPART_THRESHOLD) {
    return doMultipartUpload(folder, fileName, fileUri, contentType, fileSize, lessonId, onProgress);
  }
  const { uploadUrl, key } = await presignUpload(folder, fileName, contentType, fileSize, lessonId);
  await uploadFileToS3(uploadUrl, fileUri, contentType, onProgress);
  return key;
}
