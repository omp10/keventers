import { createContext, useContext, useId, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Field — the accessible form-row primitive. Wires a label, description and error
 * message to a control via generated ids + ARIA (`aria-describedby`,
 * `aria-invalid`), so every form input in the app is labelled and screen-reader
 * correct WITHOUT the consumer wiring ids by hand. Works with Input, Textarea,
 * Select, Combobox, etc. via the `useField()` context.
 */
type FieldCtx = {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
  disabled?: boolean;
};
const FieldContext = createContext<FieldCtx | null>(null);

/** Controls read this to get their id + aria wiring. */
export function useField() {
  return useContext(FieldContext);
}

/** Spread onto a control to connect it to its Field (id + aria-*). */
export function useFieldControlProps() {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  return {
    id: ctx.id,
    'aria-invalid': ctx.invalid || undefined,
    'aria-describedby': cn(ctx.descriptionId, ctx.invalid && ctx.errorId) || undefined,
    disabled: ctx.disabled,
  };
}

export type FieldProps = {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Layout: stacked (default) or inline (label beside control, e.g. switches). */
  orientation?: 'vertical' | 'horizontal';
  children: ReactNode;
};

export function Field({ label, description, error, required, disabled, orientation = 'vertical', className, children }: FieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-err` : undefined;
  const invalid = Boolean(error);

  return (
    <FieldContext.Provider value={{ id, descriptionId, errorId, invalid, disabled }}>
      <div
        className={cn(
          'flex gap-1.5',
          orientation === 'vertical' ? 'flex-col' : 'flex-row items-center justify-between gap-4',
          disabled && 'opacity-60',
          className,
        )}
      >
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}
        <div className={cn(orientation === 'horizontal' && 'shrink-0')}>{children}</div>
        {description && !error && (
          <p id={descriptionId} className="text-[0.8125rem] leading-snug text-foreground-muted">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-[0.8125rem] leading-snug text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
