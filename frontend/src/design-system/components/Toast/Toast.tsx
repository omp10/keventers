import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

import { useTheme } from '@/theme';

/**
 * Toast — thin wrapper over `sonner` themed to the design system. Mount
 * <Toaster/> once at the app root; call `toast.success(...)` anywhere. Styling is
 * driven by our CSS variables so toasts match the brand + scheme.
 */
export function Toaster() {
  const { scheme } = useTheme();
  return (
    <SonnerToaster
      theme={scheme}
      // TOP, not bottom: the staff, kitchen and customer apps all put their
      // primary actions along the bottom edge (tab bars, sticky Add-to-cart,
      // the board's action row). A bottom-right toast landed on top of them and
      // swallowed taps for as long as it was visible.
      position="top-center"
      gap={10}
      // Sonner translates the front toast UP by its own measured height here
      // (our !p-4 override throws off its height math), so what you actually
      // see lands at roughly `offset - toastHeight`. 140 keeps both a one-line
      // toast and a taller title+description one fully on screen and clear of
      // the sticky headers. Measured, not guessed — drop this and toasts with a
      // description render off the top edge.
      offset={140}
      toastOptions={{
        classNames: {
          toast:
            'group !bg-surface !text-foreground !border !border-border !rounded-xl !shadow-lg !gap-3 !p-4 font-sans',
          title: '!text-sm !font-semibold',
          description: '!text-[0.8125rem] !text-foreground-muted',
          actionButton: '!bg-primary !text-primary-foreground !rounded-md !text-xs !font-semibold',
          cancelButton: '!bg-muted !text-foreground-muted !rounded-md !text-xs',
          success: '!text-success',
          error: '!text-danger',
          warning: '!text-warning',
          info: '!text-info',
        },
      }}
    />
  );
}

/** The imperative toast API (success / error / warning / info / promise / custom). */
export const toast = sonnerToast;
