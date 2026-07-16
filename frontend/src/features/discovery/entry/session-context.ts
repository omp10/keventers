import { tokenStore } from '@/platform/auth';

/**
 * ACTIVE SESSION CONTEXT — the minimal, forward-compatible signal the Entry Engine
 * uses to "resume". A guest session lives in the Auth Platform's token store; the
 * branch it belongs to is remembered here so we can send the guest straight back.
 * Phase F3.2 (QR Ordering) writes the branch slug when a session opens; F3.1 only
 * reads it. No ordering logic lives here.
 */
const ACTIVE_BRANCH_KEY = 'kv-active-branch-slug';

export function getActiveBranchSlug(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BRANCH_KEY);
  } catch {
    return null;
  }
}

export function setActiveBranchSlug(slug: string | null): void {
  try {
    if (slug) localStorage.setItem(ACTIVE_BRANCH_KEY, slug);
    else localStorage.removeItem(ACTIVE_BRANCH_KEY);
  } catch {
    /* ignore */
  }
}

/** Is there a live guest session to resume? (Auth Platform is the source of truth.) */
export function hasActiveGuestSession(): boolean {
  return Boolean(tokenStore.getGuest());
}
