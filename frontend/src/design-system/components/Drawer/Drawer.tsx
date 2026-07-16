import { Drawer as DrawerPrimitive } from 'vaul';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Drawer — sliding panel/sheet built on `vaul` (native-feeling drag + snap on
 * touch, focus trap, a11y). Directional (bottom sheet on mobile, side panel on
 * desktop). Token-styled surface + scrim.
 */
export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;
export const DrawerPortal = DrawerPrimitive.Portal;

const SIDE = {
  bottom: 'inset-x-0 bottom-0 mt-24 max-h-[92vh] rounded-t-2xl border-t',
  top: 'inset-x-0 top-0 mb-24 max-h-[92vh] rounded-b-2xl border-b',
  right: 'inset-y-0 right-0 w-[min(28rem,92vw)] rounded-l-2xl border-l',
  left: 'inset-y-0 left-0 w-[min(28rem,92vw)] rounded-r-2xl border-r',
} as const;

export type DrawerContentProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
  side?: keyof typeof SIDE;
  children: ReactNode;
};

export const DrawerContent = forwardRef<React.ElementRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(
  function DrawerContent({ className, children, side = 'bottom', ...props }, ref) {
    return (
      <DrawerPortal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[1100] bg-overlay/50 backdrop-blur-[2px]" />
        <DrawerPrimitive.Content
          ref={ref}
          className={cn('fixed z-[1150] flex flex-col bg-surface text-foreground border-border shadow-xl outline-none', SIDE[side], className)}
          {...props}
        >
          {side === 'bottom' && <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border-strong" aria-hidden />}
          {children}
        </DrawerPrimitive.Content>
      </DrawerPortal>
    );
  },
);

export function DrawerHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex flex-col gap-1 p-6 pb-3', className)}>{children}</div>;
}
export function DrawerBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-2', className)}>{children}</div>;
}
export function DrawerFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('flex gap-2 p-6 pt-4 border-t border-border', className)}>{children}</div>;
}
export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;
