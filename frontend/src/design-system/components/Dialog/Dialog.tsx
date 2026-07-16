import * as DialogPrimitive from '@radix-ui/react-dialog';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Icon } from '@/design-system/icons';

/**
 * Dialog / Modal — Radix (focus trap, scroll lock, Esc, a11y) + token styling +
 * enter/exit animation via data-state. `size` controls width; `DialogContent`
 * ships a close button. Same primitive powers confirm modals and rich sheets.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

const overlay =
  'fixed inset-0 z-[1100] bg-overlay/50 backdrop-blur-[2px] data-[state=open]:animate-[kv-fade-in_150ms_ease-out]';

const SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[calc(100vw-2rem)]' } as const;

export const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return <DialogPrimitive.Overlay ref={ref} className={cn(overlay, className)} {...props} />;
});

export type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  size?: keyof typeof SIZE;
  showClose?: boolean;
};

export const DialogContent = forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  function DialogContent({ className, children, size = 'md', showClose = true, ...props }, ref) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed left-1/2 top-1/2 z-[1200] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            SIZE[size],
            'bg-surface text-foreground rounded-2xl border border-border shadow-xl',
            'focus:outline-none',
            'data-[state=open]:animate-[kv-content-show_200ms_cubic-bezier(0.16,1,0.3,1)]',
            className,
          )}
          {...props}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-foreground-muted hover:bg-[var(--kv-hover)] hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="close" size="sm" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);

export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-3', className)}>{children}</div>;
}
export function DialogBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-6 py-2 max-h-[70vh] overflow-y-auto', className)}>{children}</div>;
}
export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 pt-4', className)}>{children}</div>;
}
export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold tracking-[-0.01em]', className)} {...props} />;
});
export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn('text-sm text-foreground-muted leading-normal', className)} {...props} />;
});
