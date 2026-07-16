import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  /** Grow with content (auto-resize) — handled by the field-sizing CSS. */
  autoSize?: boolean;
};

/** Textarea — matches Input styling; optional CSS `field-sizing` auto-grow. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, autoSize, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex w-full min-h-20 resize-y bg-surface text-foreground rounded-lg border border-input px-3 py-2 text-[0.9375rem]',
        'placeholder:text-foreground-subtle',
        'transition-[color,box-shadow,border-color] duration-150 ease-standard',
        'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/60',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/50',
        autoSize && 'resize-none [field-sizing:content]',
        className,
      )}
      {...props}
    />
  );
});
