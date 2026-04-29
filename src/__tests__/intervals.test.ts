import {
  generateIntervals,
  calculateNextNotificationAt,
  getAllFutureTriggers,
} from '../utils/intervals';

const NOW = new Date('2025-06-15T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// generateIntervals
// ---------------------------------------------------------------------------
describe('generateIntervals', () => {
  it('returns all intervals when expiry is far away (identity category)', () => {
    // identity base: [180, 90, 60, 30, 14, 7, 3, 1]
    expect(generateIntervals('identity', 200)).toEqual([180, 90, 60, 30, 14, 7, 3, 1]);
  });

  it('filters out intervals larger than daysUntilExpiry', () => {
    // 10 days away: only [7, 3, 1] are <= 10 for vehicle
    expect(generateIntervals('vehicle', 10)).toEqual([7, 3, 1]);
  });

  it('returns only the final-day interval when expiry is tomorrow', () => {
    // Every category has 1 in its intervals
    expect(generateIntervals('health', 1)).toEqual([1]);
    expect(generateIntervals('finance', 1)).toEqual([1]);
  });

  it('returns empty array when already expired (daysUntilExpiry <= 0)', () => {
    expect(generateIntervals('vehicle', 0)).toEqual([]);
    expect(generateIntervals('identity', -5)).toEqual([]);
  });

  it('handles custom category', () => {
    // custom base: [30, 7, 1]
    expect(generateIntervals('custom', 15)).toEqual([7, 1]);
  });

  it('handles exact boundary (interval === daysUntilExpiry)', () => {
    // vehicle base: [60, 30, 14, 7, 3, 1] — exactly 30 days away
    expect(generateIntervals('vehicle', 30)).toEqual([30, 14, 7, 3, 1]);
  });

  it('returns correct intervals for home category', () => {
    // home base: [90, 30, 7, 1]
    expect(generateIntervals('home', 45)).toEqual([30, 7, 1]);
  });

  it('returns correct intervals for legal category', () => {
    // legal base: [90, 30, 14, 7, 1]
    expect(generateIntervals('legal', 20)).toEqual([14, 7, 1]);
  });
});

// ---------------------------------------------------------------------------
// calculateNextNotificationAt
// ---------------------------------------------------------------------------
describe('calculateNextNotificationAt', () => {
  it('returns the nearest future trigger', () => {
    // Expiry in 10 days from NOW
    const expiry = new Date('2025-06-25T12:00:00.000Z');
    // triggers: 7 days before = June 18, 3 days before = June 22, 1 day before = June 24
    const result = calculateNextNotificationAt(expiry, [7, 3, 1]);
    expect(result).toEqual(new Date('2025-06-18T12:00:00.000Z'));
  });

  it('returns null when all triggers are in the past', () => {
    // Expiry was 5 days ago — all triggers would have been even further in the past
    const expiry = new Date('2025-06-10T12:00:00.000Z');
    const result = calculateNextNotificationAt(expiry, [7, 3, 1]);
    expect(result).toBeNull();
  });

  it('returns null for an empty intervals array', () => {
    const expiry = new Date('2025-06-25T12:00:00.000Z');
    expect(calculateNextNotificationAt(expiry, [])).toBeNull();
  });

  it('returns the only future trigger when just one remains', () => {
    // Expiry in 2 days; only the 1-day trigger is still in the future
    const expiry = new Date('2025-06-17T12:00:00.000Z');
    const result = calculateNextNotificationAt(expiry, [7, 3, 1]);
    expect(result).toEqual(new Date('2025-06-16T12:00:00.000Z'));
  });
});

// ---------------------------------------------------------------------------
// getAllFutureTriggers
// ---------------------------------------------------------------------------
describe('getAllFutureTriggers', () => {
  it('returns all triggers sorted ascending when all are in the future', () => {
    const expiry = new Date('2025-07-15T12:00:00.000Z');
    // 30 days out: triggers at 7, 3, 1 days before = July 8, 12, 14
    const results = getAllFutureTriggers(expiry, [7, 3, 1]);

    expect(results).toHaveLength(3);
    expect(results[0].daysBeforeExpiry).toBe(7);
    expect(results[1].daysBeforeExpiry).toBe(3);
    expect(results[2].daysBeforeExpiry).toBe(1);

    // Verify ascending order
    for (let i = 1; i < results.length; i++) {
      expect(results[i].triggerDate.getTime()).toBeGreaterThan(
        results[i - 1].triggerDate.getTime()
      );
    }
  });

  it('excludes past triggers', () => {
    // Expiry in 2 days; 7-day and 3-day triggers are already past
    const expiry = new Date('2025-06-17T12:00:00.000Z');
    const results = getAllFutureTriggers(expiry, [7, 3, 1]);

    expect(results).toHaveLength(1);
    expect(results[0].daysBeforeExpiry).toBe(1);
  });

  it('returns empty array when all triggers are in the past', () => {
    const expiry = new Date('2025-06-10T12:00:00.000Z');
    expect(getAllFutureTriggers(expiry, [7, 3, 1])).toEqual([]);
  });

  it('returns empty array for empty intervals', () => {
    const expiry = new Date('2025-07-15T12:00:00.000Z');
    expect(getAllFutureTriggers(expiry, [])).toEqual([]);
  });

  it('trigger dates are calculated correctly relative to expiry', () => {
    const expiry = new Date('2025-07-15T12:00:00.000Z');
    const results = getAllFutureTriggers(expiry, [7]);

    expect(results[0].triggerDate).toEqual(new Date('2025-07-08T12:00:00.000Z'));
  });
});
