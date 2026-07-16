import { OTPInput as OTPRoot, type SlotProps } from 'input-otp';

import { cn } from '@/lib/cn';

/**
 * OTP Input — one-time-code entry (login, checkout verification) built on
 * `input-otp` (paste, keyboard, mobile numeric keypad, a11y). Token-styled cells
 * with an animated caret. Fully controlled via value/onChange.
 */
export type OTPInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  length?: number;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

export function OTPInput({ value, onChange, length = 6, onComplete, disabled, className, ...aria }: OTPInputProps) {
  return (
    <OTPRoot
      maxLength={length}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      containerClassName={cn('flex items-center gap-2', disabled && 'opacity-50', className)}
      aria-label={aria['aria-label'] ?? 'One-time code'}
      // `render` hands us the slot state directly — pass it down rather than
      // re-reading OTPInputContext, which isn't provided to the render tree.
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <Slot key={i} slot={slot} split={length > 6 && i === Math.floor(length / 2)} />
          ))}
        </>
      )}
    />
  );
}

function Slot({ slot, split }: { slot: SlotProps; split?: boolean }) {
  return (
    <>
      {split && <span className="mx-1 h-px w-3 bg-border" aria-hidden />}
      <div
        className={cn(
          'relative grid h-12 w-11 place-items-center rounded-lg border border-input bg-surface text-lg font-semibold tabular-nums',
          'transition-[border-color,box-shadow] duration-150',
          slot?.isActive && 'border-ring ring-2 ring-ring/50',
        )}
      >
        {slot?.char}
        {slot?.hasFakeCaret && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="h-5 w-px bg-foreground animate-[kv-caret_1s_steps(1)_infinite]" />
          </span>
        )}
      </div>
    </>
  );
}
