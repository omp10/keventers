/**
 * Pure parsing of a scanned QR value. A Keventers QR may encode a full URL
 * (`https://…/r/<slug>` or `https://…/q/<token>`) or a bare token/code. We resolve
 * it to either a branch slug (open directly) or a code (resolve via the backend).
 * No network, no side effects — trivially testable.
 */
export type ParsedQr =
  | { kind: 'slug'; slug: string }
  | { kind: 'code'; code: string }
  | { kind: 'unknown' };

const SLUG_RE = /\/r\/([a-z0-9-]+)/i;
const CODE_RE = /\/q\/([^/?#]+)/i;

export function parseScannedValue(raw: string): ParsedQr {
  const value = raw.trim();
  if (!value) return { kind: 'unknown' };

  // Try to interpret as a URL first.
  if (/^https?:\/\//i.test(value)) {
    const slugMatch = value.match(SLUG_RE);
    if (slugMatch) return { kind: 'slug', slug: slugMatch[1].toLowerCase() };
    const codeMatch = value.match(CODE_RE);
    if (codeMatch) return { kind: 'code', code: decodeURIComponent(codeMatch[1]) };
    try {
      const url = new URL(value);
      const q = url.searchParams.get('code') || url.searchParams.get('t');
      if (q) return { kind: 'code', code: q };
    } catch {
      /* fall through */
    }
    return { kind: 'unknown' };
  }

  // A relative path such as "/r/slug".
  const slugMatch = value.match(SLUG_RE);
  if (slugMatch) return { kind: 'slug', slug: slugMatch[1].toLowerCase() };

  // Otherwise treat the whole thing as a manual/token code (token.version.signature).
  if (/^[\w.\-:]+$/.test(value)) return { kind: 'code', code: value };
  return { kind: 'unknown' };
}
