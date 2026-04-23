/**
 * Browser download helpers — plugin-local copy.
 *
 * Per Sprint 28 Q11 we accept two copies (this one + vue/src/utils/download.ts)
 * to avoid cross-repo coupling. Keep them in sync; promote to vbwd-fe-core
 * only when a third consumer appears.
 */
import { api } from '@/api';

export async function downloadAuthenticatedFile(
  path: string,
  filename: string,
): Promise<void> {
  const baseUrl = (api as unknown as { baseURL: string }).baseURL ?? '/api/v1';
  const token = api.getToken();

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`,
    );
  }

  const blob = await response.blob();
  triggerBlobDownload(blob, filename);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
