import React from 'react';

// ── Animation type union ────────────────────────────────────────────────────
export type FaAnimation =
  | 'fa-beat'
  | 'fa-bounce'
  | 'fa-fade'
  | 'fa-beat-fade'
  | 'fa-flip'
  | 'fa-shake'
  | 'fa-spin'
  | 'fa-spin-pulse';

// Hover-activated classes (defined in globals.css, trigger on :hover)
export type FaHoverAnimation =
  | 'fa-hover-spin'
  | 'fa-hover-bounce'
  | 'fa-hover-beat'
  | 'fa-hover-shake'
  | 'fa-hover-flip'
  | 'fa-hover-beat-fade';

// Group-hover classes (parent must have className="group")
export type FaGroupHoverAnimation =
  | 'group-hover:fa-spin'
  | 'group-hover:fa-bounce'
  | 'group-hover:fa-beat'
  | 'group-hover:fa-shake'
  | 'group-hover:fa-flip'
  | 'group-hover:fa-beat-fade';

// Neon glow utilities (defined in globals.css)
export type FaGlow =
  | 'icon-glow-cyan'
  | 'icon-glow-amber'
  | 'icon-glow-emerald'
  | 'icon-glow-purple'
  | 'icon-glow-rose'
  | 'icon-glow-sky';

// ── Props ───────────────────────────────────────────────────────────────────
export interface FaIconProps extends React.HTMLAttributes<HTMLElement> {
  /** Icon name — with or without the "fa-" prefix, e.g. "video" or "fa-video" */
  name: string;
  prefix?: 'fa-solid' | 'fa-regular' | 'fa-brands' | 'fa-duotone';
  /** Continuous ambient animation (always on) */
  animation?: FaAnimation;
  /** Hover-only animation — fires on :hover of the icon itself */
  hoverAnim?: FaHoverAnimation;
  /** Group-hover animation — fires when a parent with className="group" is hovered */
  groupHoverAnim?: FaGroupHoverAnimation;
  /** FA6 size class */
  size?: 'fa-2xs' | 'fa-xs' | 'fa-sm' | 'fa-lg' | 'fa-xl' | 'fa-2xl';
  /** Neon drop-shadow glow (best in dark mode) */
  glow?: FaGlow;
  /** Override --fa-animation-duration inline (e.g. "2s", "500ms") */
  speed?: string;
  /** Override --fa-animation-direction inline ("normal" | "reverse") */
  reverse?: boolean;
  /** Override --fa-animation-iteration-count inline (e.g. "3", "infinite") */
  iterations?: string | number;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────
export function FaIcon({
  name,
  prefix = 'fa-solid',
  animation,
  hoverAnim,
  groupHoverAnim,
  size,
  glow,
  speed,
  reverse,
  iterations,
  className = '',
  style,
  ...props
}: FaIconProps) {
  const iconName = name.startsWith('fa-') ? name : `fa-${name}`;

  const classList = [
    prefix,
    iconName,
    animation,
    hoverAnim,
    groupHoverAnim,
    size,
    glow,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Build inline CSS-variable overrides
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cssVars: React.CSSProperties & Record<string, any> = { ...style };
  if (speed)                cssVars['--fa-animation-duration']        = speed;
  if (reverse)              cssVars['--fa-animation-direction']       = 'reverse';
  if (iterations !== undefined)
                            cssVars['--fa-animation-iteration-count'] = String(iterations);

  return (
    <i
      className={classList}
      aria-hidden="true"
      style={Object.keys(cssVars).length > 0 ? cssVars : style}
      {...props}
    />
  );
}
