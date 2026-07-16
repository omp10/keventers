import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Avatar, Icon } from '@/design-system';
import { transitions } from '@/animations';
import { glass } from '@/utils/style';
import { cn } from '@/lib/cn';
import { getActiveBranchSlug, hasActiveGuestSession } from '../entry';
import { useBranchDetail } from '../hooks';

/**
 * ContinueOrderingCard — "pick up where you left off". Reads the EXISTING
 * session signals (guest token + active branch slug written by the ordering
 * flow) and the branch detail already cached by discovery. Renders nothing when
 * there is no live session, so it never adds empty chrome.
 */
export function ContinueOrderingCard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const slug = useMemo(() => (hasActiveGuestSession() ? getActiveBranchSlug() : null), []);
  const detail = useBranchDetail(slug ?? undefined);
  const branch = detail.data;

  if (!slug || !branch) return null;

  return (
    <motion.button
      type="button"
      onClick={() => navigate(`/r/${slug}/menu`)}
      initial={reduced ? undefined : { opacity: 0, y: 10 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={transitions.default}
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      className={glass({
        className: cn(
          'flex w-full items-center gap-3 rounded-2xl p-3.5 text-left shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        ),
      })}
    >
      <span className="relative shrink-0">
        <Avatar src={branch.restaurant.logoUrl} alt="" size="md" fallback={branch.name.charAt(0)} />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-success text-success-foreground ring-2 ring-surface">
          <Icon name="clock" className="h-2.5 w-2.5" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">Continue ordering</span>
        <span className="block truncate text-sm font-semibold text-foreground">{branch.name}</span>
        <span className="block truncate text-xs text-foreground-muted">Your table session is still open</span>
      </span>
      <Icon name="chevronRight" className="h-5 w-5 shrink-0 text-foreground-subtle" />
    </motion.button>
  );
}
