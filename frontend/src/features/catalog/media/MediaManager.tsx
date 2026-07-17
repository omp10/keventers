import { useRef, useState } from 'react';

import { Badge, Button, Icon, Progress } from '@/design-system';
import { cn } from '@/lib/cn';
import type { MediaImage } from '../types';
import { useUpload } from './useUpload';

/**
 * MediaManager — image gallery with upload (backend pipeline), drag-reorder, and
 * remove. The FIRST image is the primary/cover. Cropping is a future placeholder.
 * Emits the full ordered image list via `onChange`.
 */
export function MediaManager({ images, onChange }: { images: MediaImage[]; onChange: (imgs: MediaImage[]) => void }) {
  const { upload, uploading, progress } = useUpload();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added = await upload(files);
    if (added.length) onChange([...images, ...added]);
  };

  // By INDEX, not id — images loaded from the API have no `id` (the backend
  // image schema doesn't store one), so an id filter matched every id-less
  // image and one click wiped the whole gallery.
  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div
            key={img.id ?? img.url}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current !== null) reorder(dragFrom.current, i);
              dragFrom.current = null;
              setOver(null);
            }}
            className={cn('group relative aspect-square overflow-hidden rounded-xl border bg-muted', over === i ? 'border-primary ring-2 ring-primary/30' : 'border-border')}
          >
            <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" />
            {i === 0 && <Badge tone="primary" variant="solid" className="absolute left-1.5 top-1.5 text-[0.625rem]">Cover</Badge>}
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => remove(i)}
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
            <span className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/40 p-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => reorder(i, i - 1)} className="text-white disabled:opacity-30"><Icon name="chevronLeft" className="h-4 w-4" /></button>
              <button type="button" aria-label="Move right" disabled={i === images.length - 1} onClick={() => reorder(i, i + 1)} className="text-white disabled:opacity-30"><Icon name="chevronRight" className="h-4 w-4" /></button>
            </span>
          </div>
        ))}

        {/* Upload tile */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-foreground-muted transition hover:border-primary hover:text-primary"
        >
          <span className="flex flex-col items-center gap-1">
            <Icon name="image" className="h-6 w-6" />
            <span className="text-xs font-medium">Upload</span>
          </span>
        </button>
      </div>

      {uploading && <Progress value={progress} size="sm" />}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
      <p className="text-xs text-foreground-subtle">Drag to reorder · the first image is the cover · cropping coming soon.</p>
      <Button variant="ghost" size="sm" leftIcon="image" onClick={() => inputRef.current?.click()} loading={uploading}>Add images</Button>
    </div>
  );
}
