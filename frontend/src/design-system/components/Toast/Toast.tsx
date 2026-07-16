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
      position="bottom-right"
      gap={10}
      offset={16}
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
