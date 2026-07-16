import { api } from '@/platform/api';

/**
 * downloadFile — fetch a backend export/asset (authenticated, via the API Platform)
 * and save it. Lives in the service layer so components never touch `api` directly.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const blob = await api.download(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
