/**
 * Layout tokens — the structural dimensions every shell/layout reads (sidebar
 * widths, header/topbar heights, content max-widths, safe-area gutters). One
 * source keeps Customer / Restaurant / Admin / Kitchen shells dimensionally
 * consistent.
 */
export const layout = {
  /** App shell chrome. */
  sidebar: {
    width: '16rem', // 256
    widthCompact: '13.5rem',
    collapsed: '4.25rem', // rail
  },
  header: {
    height: '3.75rem', // 60 — desktop topbar
    heightMobile: '3.5rem',
  },
  bottomNav: {
    height: '4rem', // mobile tab bar (Customer PWA)
  },
  /** Reading / content measures. */
  content: {
    prose: '42rem', // 672 — optimal reading line length
    narrow: '32rem',
    default: '80rem', // 1280
    wide: '96rem',
    full: '100%',
  },
  /** Consistent gutters per breakpoint (used by <Container/>). */
  gutter: {
    mobile: '1rem',
    tablet: '1.5rem',
    desktop: '2rem',
  },
  /** Standard control heights by size (rem) — keeps inputs/buttons aligned. */
  control: {
    xs: '1.75rem', // 28
    sm: '2rem', // 32
    md: '2.5rem', // 40
    lg: '2.75rem', // 44
    xl: '3.25rem', // 52
  },
} as const;

export type ControlSize = keyof typeof layout.control;
