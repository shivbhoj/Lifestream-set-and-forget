import type { ReminderCategory } from '../types';
import { subtractDays } from './dates';

/** Base reminder intervals (days before expiry) per category. */
const BASE_INTERVALS: Record<ReminderCategory, number[]> = {
  identity: [180, 90, 60, 30, 14, 7, 3, 1],
  vehicle:  [60, 30, 14, 7, 3, 1],
  health:   [30, 14, 7, 3, 1],
  finance:  [30, 14, 7, 1],
  home:     [90, 30, 7, 1],
  legal:    [90, 30, 14, 7, 1],
  custom:   [30, 7, 1],
};

/**
 * Returns the reminder intervals that are still in the future.
 * e.g. if expiry is 10 days away, only [7, 3, 1] would be returned for 'vehicle'.
 */
export function generateIntervals(
  category: ReminderCategory,
  daysUntilExpiry: number
): number[] {
  return BASE_INTERVALS[category].filter((d) => d <= daysUntilExpiry);
}

/**
 * Given an expiration date and a list of intervals, returns the next
 * notification Date (the nearest future interval trigger).
 * Returns null if all intervals have passed.
 */
export function calculateNextNotificationAt(
  expirationDate: Date,
  intervals: number[]
): Date | null {
  const now = new Date();
  const futureTriggers = intervals
    .map((d) => subtractDays(expirationDate, d))
    .filter((trigger) => trigger > now)
    .sort((a, b) => a.getTime() - b.getTime());

  return futureTriggers[0] ?? null;
}

/**
 * Returns all future notification trigger dates for a reminder.
 * Used when scheduling local Expo notifications on reminder create/update.
 */
export function getAllFutureTriggers(
  expirationDate: Date,
  intervals: number[]
): { daysBeforeExpiry: number; triggerDate: Date }[] {
  const now = new Date();
  return intervals
    .map((d) => ({ daysBeforeExpiry: d, triggerDate: subtractDays(expirationDate, d) }))
    .filter(({ triggerDate }) => triggerDate > now)
    .sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime());
}
