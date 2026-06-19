import { getSession } from '@/lib/auth/storage';
import { TUTOR_BASE_URL } from './tutor-client';

type UploadFolder = 'thumbnail' | 'promo-video' | 'lesson-video' | 'assignment' | 'resource';

export async function presignUpload(
  folder: UploadFolder,
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string }> {
  const token = await getSession();
  const res = await fetch(`${TUTOR_BASE_URL}/api/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `authjs.session-token=${token}` } : {}),
    },
    body: JSON.stringify({ folder, filename, contentType }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Presign failed');
  return json.data;
}

export async function uploadFileToS3(
  uploadUrl: string,
  fileUri: string,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send({ uri: fileUri, type: contentType, name: 'upload' } as unknown as Document);
  });
}
