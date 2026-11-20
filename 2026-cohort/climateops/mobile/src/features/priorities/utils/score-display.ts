import { Palette } from '@/constants/theme';
import type { FacilityPriority } from '@/features/priorities/types/priority';

/** Whether a score means anything: no alert, or no one on site, shows "—". */
export function hasScore(p: FacilityPriority | null): p is FacilityPriority {
  return p !== null && !p.no_one_on_site;
}

export function scoreLabel(p: FacilityPriority | null): string {
  return hasScore(p) ? `${p.score}` : '—';
}

export function scoreColor(p: FacilityPriority | null): string {
  if (!hasScore(p)) return Palette.muted;
  if (p.score >= 80) return Palette.danger;
  if (p.score >= 60) return Palette.warning;
  return Palette.accent;
}

export function scoreTextClass(p: FacilityPriority | null): string {
  if (!hasScore(p)) return 'text-muted';
  if (p.score >= 80) return 'text-danger';
  if (p.score >= 60) return 'text-warning';
  return 'text-accent';
}

export function scoreLevel(p: FacilityPriority | null): string {
  if (p === null) return 'No active heat alert';
  if (p.no_one_on_site) return 'No one on site today';
  if (p.score >= 80) return 'Very high';
  if (p.score >= 60) return 'High';
  if (p.score >= 40) return 'Moderate';
  return 'Low';
}
