import { t } from '../i18n/en';

/**
 * The prototype uses a fixed "today" so that the example content (which is dated
 * inside the project period 2027–2029) always looks current.
 */
export const DEMO_TODAY = '2027-11-15';

export const today = () => DEMO_TODAY;

/** Timestamp for new items: the demo date with the real time of day. */
export function nowIso(): string {
  return `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 8)}`;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const toDate = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00Z');

export const formatDate = (iso: string) => dateFmt.format(toDate(iso));
export const formatLongDate = (iso: string) => longFmt.format(toDate(iso));
export const formatMonth = (yyyyMm: string) => monthFmt.format(toDate(yyyyMm + '-01'));

export function formatDateTime(iso: string): string {
  const time = iso.length > 10 ? `, ${iso.slice(11, 16)}` : '';
  return formatDate(iso) + time;
}

export function daysFromToday(iso: string): number {
  return Math.round((toDate(iso).getTime() - toDate(DEMO_TODAY).getTime()) / 86400000);
}

/** "Today", "Yesterday", "3 days ago", or the date. */
export function relativeDate(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return t.time.today;
  if (d === -1) return t.time.yesterday;
  if (d === 1) return t.time.tomorrow;
  if (d < 0 && d >= -6) return fill(t.time.daysAgo, { n: -d });
  if (d > 0 && d <= 6) return fill(t.time.inDays, { n: d });
  return formatDate(iso);
}

export function formatRange(start: string, end?: string): string {
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

/** Replace {name} placeholders in a UI string. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const includesText = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.trim().toLowerCase());
