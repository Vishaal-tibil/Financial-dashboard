export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtSigned(v: number | null | undefined, suffix = '', digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const s = v.toLocaleString(undefined, { maximumFractionDigits: digits });
  return `${v > 0 ? '+' : ''}${s}${suffix}`;
}

// Palette for per-company chart series.
export const SERIES_COLORS = ['#2D5BFF', '#7C5CFC', '#16A34A', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6'];

export function colorFor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
