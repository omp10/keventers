import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@/layouts';
import { Button, Input, toast } from '@/design-system';
import { useAuth } from '@/platform/auth';

/**
 * AdminLoginPage — dedicated sign-in entry for the platform admin surface. Uses
 * admin-specific messaging and returns to /admin by default.
 */
export function AdminLoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const fromState = (location.state as { from?: string } | null)?.from;
  const preferred = redirectParam ?? fromState;
  const nextPath = preferred?.startsWith('/') ? preferred : '/admin';

  if (isAuthenticated) return <Navigate to={nextPath} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ email, password });
      navigate(nextPath, { replace: true });
    } catch (err) {
      toast.error('Sign in failed', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Admin sign in"
      subtitle="Access platform operations, approvals, monitoring, and controls"
      aside={(
        <>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Operate the platform with the right level of control.</h2>
          <p className="mt-3 text-primary-foreground/80">Manage organizations, approvals, feature flags, and monitoring from one secure admin surface.</p>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" autoComplete="username" required autoFocus />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required />
        <Button type="submit" fullWidth size="lg" loading={busy}>Enter admin</Button>
      </form>
    </AuthLayout>
  );
}
