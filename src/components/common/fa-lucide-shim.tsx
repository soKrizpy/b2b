import React from 'react';
import { FaIcon, FaAnimation } from './FaIcon';

interface ShimProps {
  className?: string;
  size?: number | string;
  color?: string;
  animation?: FaAnimation;
}

function createShim(defaultIcon: string, defaultAnim?: FaAnimation) {
  return function LucideShim({ className = '', animation = defaultAnim }: ShimProps) {
    return <FaIcon name={defaultIcon} animation={animation} className={className} />;
  };
}

export const Video = createShim('fa-video', 'fa-beat-fade');
export const Radio = createShim('fa-tower-broadcast', 'fa-beat-fade');
export const Coins = createShim('fa-coins');
export const Trophy = createShim('fa-trophy');
export const Heart = createShim('fa-heart', 'fa-beat');
export const HeartPulse = createShim('fa-heart-pulse', 'fa-beat');
export const Star = createShim('fa-star', 'fa-fade');
export const Sparkles = createShim('fa-wand-magic-sparkles', 'fa-fade');
export const AlertTriangle = createShim('fa-triangle-exclamation', 'fa-shake');
export const ShieldCheck = createShim('fa-shield-halved', 'fa-beat-fade');
export const RotateCw = createShim('fa-rotate', 'fa-spin');
export const Settings = createShim('fa-gear', 'fa-spin-pulse');
export const Lock = createShim('fa-lock');
export const LockOpen = createShim('fa-lock-open');
export const ArrowRight = createShim('fa-arrow-right');
export const ChevronRight = createShim('fa-chevron-right');
export const GraduationCap = createShim('fa-graduation-cap', 'fa-fade');
export const Send = createShim('fa-paper-plane');
export const Award = createShim('fa-award');
export const FileText = createShim('fa-file-invoice-dollar');
export const ExternalLink = createShim('fa-arrow-up-right-from-square');
export const Play = createShim('fa-play');
export const Paw = createShim('fa-paw', 'fa-beat');
export const Egg = createShim('fa-egg', 'fa-fade');
export const Calendar = createShim('fa-calendar-days');
export const Clock = createShim('fa-clock');
export const CheckCircle2 = createShim('fa-circle-check');
export const UserGraduate = createShim('fa-user-graduate');
export const Landmark = createShim('fa-landmark');
