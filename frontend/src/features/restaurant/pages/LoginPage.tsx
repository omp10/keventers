import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AuthLayout } from '@/layouts';
import { Button, Input, toast } from '@/design-system';
import { useAuth } from '@/platform/auth';

/**
 * LoginPage — staff sign-in via the Identity module (Auth Platform). On success the
 * session is stored and the dashboard becomes accessible. Reuses the F1 AuthLayout.
 */
export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith('/dashboard') ? from : '/dashboard', { replace: true });
    } catch (err) {
      toast.error('Sign in failed', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Staff sign in" subtitle="Access your restaurant operations dashboard">
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email" autoComplete="username" required autoFocus />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required />
        <Button type="submit" fullWidth size="lg" loading={busy}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
