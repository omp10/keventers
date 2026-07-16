import { createElement, forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import { textRoles, type TextRole } from '@/theme';

/**
 * Typography — <Heading> and <Text> apply a SEMANTIC type role (size + line-height
 * + tracking + weight) from the tokens, so copy is consistent everywhere and a
 * brand's type scale flows through automatically. No component hardcodes font
 * sizes; they name a role.
 */
function roleStyle(role: TextRole) {
  const t = textRoles[role];
  return { fontSize: `calc(${t.size} * var(--kv-text-scale, 1))`, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing, fontWeight: t.weight };
}

const TONE = {
  default: 'text-foreground',
  muted: 'text-foreground-muted',
  subtle: 'text-foreground-subtle',
  primary: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
} as const;

export type TextProps = HTMLAttributes<HTMLElement> & {
  as?: keyof HTMLElementTagNameMap;
  variant?: TextRole;
  tone?: keyof typeof TONE;
  truncate?: boolean;
};

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { as = 'p', variant = 'body', tone = 'default', truncate, className, style, ...props },
  ref,
) {
  return createElement(as, {
    ref,
    className: cn(TONE[tone], truncate && 'truncate', className),
    style: { ...roleStyle(variant), ...style },
    ...props,
  });
});

const HEADING_TAG: Record<string, keyof HTMLElementTagNameMap> = {
  displayXl: 'h1', displayLg: 'h1', display: 'h1', h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', title: 'h5',
};

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: Extract<TextRole, 'displayXl' | 'displayLg' | 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'title'>;
  as?: keyof HTMLElementTagNameMap;
  tone?: keyof typeof TONE;
  gradient?: boolean;
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 'h2', as, tone = 'default', gradient, className, style, ...props },
  ref,
) {
  return createElement(as ?? HEADING_TAG[level] ?? 'h2', {
    ref,
    className: cn(
      'font-display text-balance',
      gradient ? 'bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent' : TONE[tone],
      className,
    ),
    style: { ...roleStyle(level), ...style },
    ...props,
  });
});
