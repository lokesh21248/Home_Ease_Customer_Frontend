/**
 * workerMarkerStyle.ts - what the partner's map badge shows. Pure (unit-tested in tests/worker-marker.test.cjs).
 */

export interface CategoryIcon {
  /** Ionicons glyph name */
  icon: string;
  /** badge background colour */
  color: string;
  /** short trade label */
  label: string;
}

const RULES: { match: RegExp; value: CategoryIcon }[] = [
  { match: /electric|wiring|switch|fan|light/i, value: { icon: 'flash', color: '#F59E0B', label: 'Electrician' } },
  { match: /plumb|pipe|tap|leak|drain|water/i, value: { icon: 'water', color: '#0EA5E9', label: 'Plumber' } },
  { match: /\bac\b|a\/c|air ?condition|hvac|cooling/i, value: { icon: 'snow', color: '#06B6D4', label: 'AC technician' } },
  { match: /clean|maid|housekeep/i, value: { icon: 'sparkles', color: '#10B981', label: 'Cleaner' } },
  { match: /carpent|furniture|wood/i, value: { icon: 'hammer', color: '#A16207', label: 'Carpenter' } },
  { match: /paint/i, value: { icon: 'color-palette', color: '#8B5CF6', label: 'Painter' } },
  { match: /pest|termite/i, value: { icon: 'bug', color: '#EF4444', label: 'Pest control' } },
  { match: /appliance|repair|fridge|washing|microwave|ro\b|purifier/i, value: { icon: 'construct', color: '#6366F1', label: 'Technician' } },
];

const DEFAULT_ICON: CategoryIcon = { icon: 'person', color: '#2563EB', label: 'Service partner' };

/** Trade icon for a service category / service name. Unknown categories get a neutral person icon. */
export function categoryIcon(serviceCategory?: string | null): CategoryIcon {
  const text = (serviceCategory || '').trim();
  if (!text) return DEFAULT_ICON;
  for (const r of RULES) {
    if (r.match.test(text)) return r.value;
  }
  return DEFAULT_ICON;
}

/** Badge status line: "Live" only with a fresh, connected location; otherwise how long ago it was seen. */
export function liveLabel(isLive: boolean, lastReceivedLocalMs: number | null, nowMs: number): string {
  if (isLive) return 'Live';
  if (lastReceivedLocalMs === null) return 'Offline';
  const s = Math.max(0, Math.round((nowMs - lastReceivedLocalMs) / 1000));
  if (s < 60) return `Seen ${s}s ago`;
  return `Seen ${Math.round(s / 60)}m ago`;
}
