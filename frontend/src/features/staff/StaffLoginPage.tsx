import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { Button, Card, Icon } from '@/design-system';
import { AuthLayout } from '@/layouts';
import { PhoneOtpForm, useAuth } from '@/platform/auth';

const STAFF_ROLES = ['staff', 'branch_manager', 'restaurant_manager', 'organization_admin'];

/**
 * StaffLoginPage — phone-only sign-in for floor staff. The phone number IS the
 * credential: managers add a staff member's number, and only that number can
 * open this app. A number that verifies but has no staff role sees an explicit
 * "ask your manager" state instead of a confusing redirect loop.
 */
export function StaffLoginPage() {
  const { isAuthenticated, roles, logout } = useAuth();
  const navigate = useNavigate();
  const [notStaff, setNotStaff] = useState(false);

  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
  if (isAuthenticated && isStaff) return <Navigate to="/staff" replace />;

  if (notStaff || (isAuthenticated && !isStaff)) {
    return (
      <AuthLayout title="Almost there" subtitle="This number isn't registered as staff yet">
        <Card padding="lg" className="space-y-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning-soft text-warning">
            <Icon name="users" className="h-7 w-7" />
          </span>
          <p className="text-sm text-foreground-muted">
            Ask your manager to add this phone number as a staff member for the outlet. Once added, sign in again and
            your assigned orders will be waiting.
          </p>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void logout().then(() => setNotStaff(false))}
          >
            Try a different number
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Staff sign in"
      subtitle="Enter your work phone number to see your assigned orders"
      aside={(
        <>
          <h2 className="text-3xl font-bold tracking-tight text-balance">Your shift, one thumb.</h2>
          <p className="mt-3 text-primary-foreground/80">Assigned orders, one-tap updates, and live kitchen alerts — built for the floor.</p>
        </>
      )}
    >
      <PhoneOtpForm
        submitLabel="Send code"
        onSignedIn={({ isNewUser }) => {
          // A brand-new number can't be staff — a manager must add it first.
          if (isNewUser) setNotStaff(true);
          else navigate('/staff', { replace: true });
        }}
      />
    </AuthLayout>
  );
}
