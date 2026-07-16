import { useCallback, useState } from 'react';

import { toast } from '@/design-system';
import { mediaService } from '../services';
import type { MediaImage } from '../types';

/**
 * useUpload — uploads images through the BACKEND media pipeline (Cloudinary via the
 * Storage Platform). The frontend never holds provider keys; it posts the file and
 * receives the stored URL. Tracks progress; supports multiple files.
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (files: FileList | File[]): Promise<MediaImage[]> => {
    const list = Array.from(files);
    if (list.length === 0) return [];
    setUploading(true);
    setProgress(0);
    const out: MediaImage[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        const img = await mediaService.upload(list[i], (pct) => setProgress(Math.round(((i + pct / 100) / list.length) * 100)));
        out.push(img);
      }
    } catch (e) {
      toast.error('Upload failed', { description: (e as Error).message });
    } finally {
      setUploading(false);
      setProgress(0);
    }
    return out;
  }, []);

  return { upload, uploading, progress };
}
