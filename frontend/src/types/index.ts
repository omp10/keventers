/**
 * Shared UI types reused across the design system. Domain/business types live in
 * each consuming app, not here — this is presentation-only.
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

/** A component that forwards a ref + accepts className — the DS component shape. */
export type WithClassName<P = unknown> = P & { className?: string };
