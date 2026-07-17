import { useEffect, useState, type FormEvent } from 'react';

import { Button, Icon, Input, OTPInput, toast } from '@/design-system';
import { authService } from '@/services';
import { cn } from '@/lib/cn';
import { useAuth } from './useAuth';

/**
 * PhoneOtpForm — the passwordless sign-in shared by the Customer, Kitchen and
 * Staff apps: enter a number, receive a code, enter the code. It owns only the
 * two-step UX (request → verify, resend cooldown, autofocus); the Auth Platform
 * owns the session. `onSignedIn` receives `isNewUser` so each app decides where a
 * first-timer lands (onboarding vs. straight into the app).
 *
 * Because all three panels share it, the dev-code affordance below appears on all
 * three identically — there is no per-app sign-in to keep in sync.
 */
export function PhoneOtpForm({
  onSignedIn,
  submitLabel = 'Continue',
  className,
}: {
  onSignedIn: (result: { isNewUser: boolean }) => void;
  submitLabel?: string;
  className?: string;
}) {
  const { loginWithOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Resend cooldown ticker (the backend enforces it; this just reflects it).
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (isResend = false) => {
    setBusy(true);
    try {
      const challenge = await authService.requestOtp(phone);
      setStep('code');
      setResendIn(challenge.resendInSeconds);
      // With MOCK_OTP on, the API echoes the code it accepts. Hold it in state
      // and render it beside the input: a toast announcing a code you then have
      // to TYPE is the one thing that must not disappear while you're reading it.
      setDevCode(challenge.devCode ?? null);
      toast.success(isResend ? 'New code sent' : 'Code sent', { description: `Sent to ${challenge.phone}` });
    } catch (err) {
      toast.error('Could not send the code', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    try {
      const result = await loginWithOtp(phone, value);
      onSignedIn(result);
    } catch (err) {
      toast.error('Sign in failed', { description: (err as Error).message });
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 'phone') void sendCode();
    else if (code.length === 6) void verify(code);
  };

  return (
    <form onSubmit={submit} className={cn('space-y-3', className)}>
      {step === 'phone' ? (
        <>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            leftIcon="phone"
            required
            autoFocus
          />
          <Button type="submit" fullWidth size="lg" loading={busy} disabled={phone.trim().length < 8}>
            {submitLabel}
          </Button>
          <p className="text-center text-xs text-foreground-subtle">
            We'll text you a 6-digit code. No password needed.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-foreground-muted">
              Code sent to <strong className="text-foreground">{phone}</strong>
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setStep('phone');
                setCode('');
                setDevCode(null);
              }}
            >
              Change
            </Button>
          </div>

          {/* Dev-only: the code the API will accept, shown because there is no
              SMS to read it from. Persistent (not a toast) and tappable, so it's
              still there when you look down to type it. Renders ONLY when the
              backend echoed a code, which production never does. */}
          {devCode && (
            <button
              type="button"
              onClick={() => { setCode(devCode); if (!busy) void verify(devCode); }}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-warning bg-warning-soft px-3 py-2 text-left text-warning-foreground transition hover:bg-warning-soft/70"
            >
              <Icon name="info" className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">
                Test code <strong className="font-mono text-sm tracking-widest">{devCode}</strong> — tap to fill
              </span>
            </button>
          )}

          {/* Auto-submits on the 6th digit — one less tap on a phone. */}
          <OTPInput
            length={6}
            value={code}
            onChange={setCode}
            onComplete={(v) => { if (!busy) void verify(v); }}
            disabled={busy}
            aria-label="Verification code"
          />

          <Button type="submit" fullWidth size="lg" loading={busy} disabled={code.length !== 6}>
            Verify &amp; continue
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={resendIn > 0 || busy}
              onClick={() => void sendCode(true)}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
