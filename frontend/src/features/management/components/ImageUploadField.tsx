import { useRef, useState } from 'react';

import { Button, Icon, Progress, toast } from '@/design-system';
import { cn } from '@/lib/cn';

/**
 * ImageUploadField — the reusable "pick or drop an image" control for management
 * forms (banners, category tiles, kitchen covers). It owns the upload lifecycle
 * (progress, preview, replace, clear) but NOT the transport: the caller passes
 * an `upload` fn, so the field stays agnostic of which endpoint/folder is used
 * and no storage keys ever live in the browser.
 *
 * The value is the resulting image URL — the field is a controlled input.
 */
export function ImageUploadField({
  value,
  onChange,
  upload,
  label = 'Image',
  hint = 'PNG or JPG, up to 10 MB.',
  aspect = 'aspect-[16/9]',
  className,
}: {
  value?: string;
  onChange: (url: string) => void;
  /** Performs the actual upload; resolves to the stored image URL. */
  upload: (file: File, onProgress: (pct: number) => void) => Promise<{ url: string }>;
  label?: string;
  hint?: string;
  /** Preview aspect ratio utility (e.g. 'aspect-square' for category tiles). */
  aspect?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const send = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Only image files are supported.');
    if (file.size > 10 * 1024 * 1024) return toast.error('That image is larger than 10 MB.');
    setProgress(0);
    try {
      const { url } = await upload(file, setProgress);
      onChange(url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {value && (
          <Button variant="ghost" size="sm" leftIcon="close" onClick={() => onChange('')}>
            Remove
          </Button>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void send(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'relative grid w-full place-items-center overflow-hidden rounded-xl border border-dashed bg-surface-raised transition-colors',
          aspect,
          dragging ? 'border-primary bg-primary-soft' : 'border-border',
        )}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="p-4 text-center">
            <Icon name="image" className="mx-auto h-6 w-6 text-foreground-subtle" />
            <p className="mt-2 text-sm text-foreground-muted">Drag an image here, or</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
          </div>
        )}

        {value && (
          <div className="absolute bottom-2 right-2">
            <Button variant="secondary" size="sm" leftIcon="refresh" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
          </div>
        )}

        {progress !== null && (
          <div className="absolute inset-x-0 bottom-0 bg-overlay/60 p-2">
            <Progress value={progress} />
          </div>
        )}
      </div>

      <p className="text-xs text-foreground-subtle">{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void send(e.target.files?.[0]);
          e.target.value = ''; // allow re-picking the same file
        }}
      />
    </div>
  );
}
