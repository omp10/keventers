import { useEffect, useState, type FormEvent } from 'react';

import { Button, Input, OTPInput, toast } from '@/design-system';
import { authService } from '@/services';
import { cn } from '@/lib/cn';
import { useAuth } from './useAuth';

/**
 * PhoneOtpForm — the passwordless sign-in used by the Kitchen and Staff apps:
 * enter a number, receive a code, enter the code. It owns only the two-step UX
 * (request → verify, resend cooldown, autofocus); the Auth Platform owns the
 * session. `onSignedIn` receives `isNewUser` so each app decides where a
 * first-timer lands (onboarding vs. straight into the app).
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
      // Outside production the API echoes the code so the flow is testable.
      toast.success(isResend ? 'New code sent' : 'Code sent', {
        description: challenge.devCode ? `Dev code: ${challenge.devCode}` : `Sent to ${challenge.phone}`,
      });
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
              }}
            >
              Change
            </Button>
          </div>

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
