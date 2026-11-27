import type { ImageSourcePropType } from 'react-native';

import type { Facility, FacilityFilter, FacilitySort } from '@/features/facilities/types/facility';

export function isDemo(f: Facility): boolean {
  return f.record_type !== 'REAL';
}

export function acWorking(f: Facility): boolean {
  return f.ac_working_today === 'Y';
}

export function updatedToday(f: Facility, now = new Date()): boolean {
  return dayKey(new Date(f.status_updated_at)) === dayKey(now);
}

const PHOTOS: Record<string, ImageSourcePropType> = {
  library: require('@/assets/images/buildings/library.jpg'),
  'community center': require('@/assets/images/buildings/community-center.jpg'),
  'recreation center': require('@/assets/images/buildings/recreation-center.jpg'),
  'older adult center': require('@/assets/images/buildings/older-adult-center.jpg'),
  'public school': require('@/assets/images/buildings/school.jpg'),
  'child care center': require('@/assets/images/buildings/child-care.jpg'),
  'older adult residence': require('@/assets/images/buildings/residence.jpg'),
};

export function facilityPhoto(f: Facility): ImageSourcePropType {
  return PHOTOS[f.facility_type] ?? PHOTOS['community center'];
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatUpdated(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (dayKey(d) === dayKey(now)) return `Today, ${formatTime(iso)}`;
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${date}, ${formatTime(iso)}`;
}

export function matchesFilter(f: Facility, filter: FacilityFilter): boolean {
  if (filter === 'ac-on') return acWorking(f);
  if (filter === 'ac-down') return !acWorking(f);
  if (filter === 'real') return !isDemo(f);
  if (filter === 'demo') return isDemo(f);
  return true;
}

/** "risk" follows the server's heat-risk rank; buildings without one (no active alert) fall back to name order. */
export function sortFacilities(list: Facility[], sort: FacilitySort, rankOf: (id: string) => number | null): Facility[] {
  const copy = [...list];
  if (sort === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'occupancy') return copy.sort((a, b) => b.occupancy_today - a.occupancy_today);
  const rank = (f: Facility) => rankOf(f.facility_id) ?? Number.POSITIVE_INFINITY;
  return copy.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
