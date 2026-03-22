/**
 * Number of whole days between now and a future date.
 * Negative if the date is in the past.
 */
export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Add `days` calendar days to a date and return a new Date. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Subtract `days` calendar days from a date and return a new Date. */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Human-readable relative label, e.g.:
 *  - "Overdue by 3 days"
 *  - "Today"
 *  - "Tomorrow"
 *  - "In 14 days"
 *  - "In 6 months"
 */
export function relativeDateLabel(isoDate: string): string {
  const days = daysBetween(new Date(), new Date(isoDate));

  if (days < -1) return `Overdue by ${Math.abs(days)} days`;
  if (days === -1) return 'Overdue by 1 day';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 30) return `In ${days} days`;
  if (days < 60) return 'In about 1 month';

  const months = Math.round(days / 30);
  return `In ${months} months`;
}

/** Format a date as "Mar 15, 2026" */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date as "March 15, 2026" (long form) */
export function formatDateLong(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Returns true if the given ISO date is in the past. */
export function isOverdue(isoDate: string): boolean {
  return new Date(isoDate) < new Date();
}

/** Returns true if the given ISO date is within the next `days` days. */
export function isWithinDays(isoDate: string, days: number): boolean {
  const d = daysBetween(new Date(), new Date(isoDate));
  return d >= 0 && d <= days;
}
