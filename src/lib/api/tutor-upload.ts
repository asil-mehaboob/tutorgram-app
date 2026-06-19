import { File as FSFile, UploadTask, UploadType } from 'expo-file-system';
import { getSession } from '@/lib/auth/storage';
import { TUTOR_BASE_URL } from './tutor-client';

type UploadFolder = 'thumbnail' | 'promo-video' | 'lesson-video' | 'assignment' | 'resource';

export async function presignUpload(
  folder: UploadFolder,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<{ uploadUrl: string; key: string }> {
  const token = await getSession();
  const res = await fetch(`${TUTOR_BASE_URL}/api/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `authjs.session-token=${token}` } : {}),
    },
    body: JSON.stringify({ folder, fileName, fileType, fileSize }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Presign failed');
  return { uploadUrl: json.data.presignedUrl, key: json.data.fileRef };
}

export async function uploadFileToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const file = new FSFile(fileUri);
  const task = new UploadTask(file, uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(Math.round((bytesSent / totalBytes) * 100));
    },
  });
  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status})`);
  }
}
