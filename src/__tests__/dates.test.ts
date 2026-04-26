import {
  daysBetween,
  addDays,
  subtractDays,
  relativeDateLabel,
  formatDate,
  formatDateLong,
  isOverdue,
  isWithinDays,
} from '../utils/dates';

// Pin "now" so tests don't depend on wall-clock time
const NOW = new Date('2025-06-15T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// daysBetween
// ---------------------------------------------------------------------------
describe('daysBetween', () => {
  it('returns positive days for a future date', () => {
    const future = new Date('2025-06-20T12:00:00.000Z');
    expect(daysBetween(NOW, future)).toBe(5);
  });

  it('returns negative days for a past date', () => {
    const past = new Date('2025-06-10T12:00:00.000Z');
    expect(daysBetween(NOW, past)).toBe(-5);
  });

  it('returns 0 for the same instant', () => {
    expect(daysBetween(NOW, NOW)).toBe(0);
  });

  it('returns 0 for a date less than 24 hours ahead', () => {
    const almostTomorrow = new Date('2025-06-16T11:59:00.000Z');
    expect(daysBetween(NOW, almostTomorrow)).toBe(0);
  });

  it('handles month boundaries correctly', () => {
    const from = new Date('2025-01-30T12:00:00.000Z');
    const to = new Date('2025-03-01T12:00:00.000Z');
    // Jan 30 → Jan 31 (1) + Feb 2025 (28 days) + Mar 1 (1) = 30 days
    expect(daysBetween(from, to)).toBe(30);
  });

  it('handles year boundaries correctly', () => {
    const from = new Date('2025-12-31T12:00:00.000Z');
    const to = new Date('2026-01-01T12:00:00.000Z');
    expect(daysBetween(from, to)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// addDays / subtractDays
// ---------------------------------------------------------------------------
describe('addDays', () => {
  it('adds days correctly', () => {
    const result = addDays(new Date('2025-06-15'), 10);
    expect(result.getDate()).toBe(25);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
  });

  it('rolls over month boundary', () => {
    const result = addDays(new Date('2025-06-25'), 10);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(5);
  });

  it('rolls over year boundary', () => {
    const result = addDays(new Date('2025-12-28'), 5);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(2);
  });

  it('does not mutate the original date', () => {
    const original = new Date('2025-06-15');
    addDays(original, 5);
    expect(original.getDate()).toBe(15);
  });
});

describe('subtractDays', () => {
  it('subtracts days correctly', () => {
    const result = subtractDays(new Date('2025-06-15'), 10);
    expect(result.getDate()).toBe(5);
  });

  it('rolls back across a month boundary', () => {
    const result = subtractDays(new Date('2025-07-05'), 10);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(25);
  });

  it('is the inverse of addDays', () => {
    const date = new Date('2025-06-15');
    expect(subtractDays(addDays(date, 30), 30).getTime()).toBe(date.getTime());
  });
});

// ---------------------------------------------------------------------------
// relativeDateLabel
// ---------------------------------------------------------------------------
describe('relativeDateLabel', () => {
  it('returns "Today" when days === 0', () => {
    expect(relativeDateLabel(NOW.toISOString())).toBe('Today');
  });

  it('returns "Tomorrow" when days === 1', () => {
    const tomorrow = new Date('2025-06-16T12:00:00.000Z');
    expect(relativeDateLabel(tomorrow.toISOString())).toBe('Tomorrow');
  });

  it('returns "In X days" for 2–29 days away', () => {
    const inTen = new Date('2025-06-25T12:00:00.000Z');
    expect(relativeDateLabel(inTen.toISOString())).toBe('In 10 days');
  });

  it('returns "In X days" at the 29-day boundary', () => {
    const in29 = new Date('2025-07-14T12:00:00.000Z');
    expect(relativeDateLabel(in29.toISOString())).toBe('In 29 days');
  });

  it('returns "In about 1 month" at 30 days', () => {
    const in30 = new Date('2025-07-15T12:00:00.000Z');
    expect(relativeDateLabel(in30.toISOString())).toBe('In about 1 month');
  });

  it('returns "In about 1 month" up to 59 days', () => {
    const in59 = new Date('2025-08-13T12:00:00.000Z');
    expect(relativeDateLabel(in59.toISOString())).toBe('In about 1 month');
  });

  it('returns "In X months" at 60 days', () => {
    const in60 = new Date('2025-08-14T12:00:00.000Z');
    expect(relativeDateLabel(in60.toISOString())).toBe('In 2 months');
  });

  it('returns "Overdue by 1 day" when days === -1', () => {
    const yesterday = new Date('2025-06-14T12:00:00.000Z');
    expect(relativeDateLabel(yesterday.toISOString())).toBe('Overdue by 1 day');
  });

  it('returns "Overdue by X days" when days <= -2', () => {
    const weekAgo = new Date('2025-06-08T12:00:00.000Z');
    expect(relativeDateLabel(weekAgo.toISOString())).toBe('Overdue by 7 days');
  });
});

// ---------------------------------------------------------------------------
// formatDate / formatDateLong
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats as "Mon DD, YYYY"', () => {
    expect(formatDate('2026-03-15')).toBe('Mar 15, 2026');
  });
});

describe('formatDateLong', () => {
  it('formats with full month name', () => {
    expect(formatDateLong('2026-03-15')).toBe('March 15, 2026');
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------
describe('isOverdue', () => {
  it('returns true for a past date', () => {
    expect(isOverdue('2025-06-01T00:00:00.000Z')).toBe(true);
  });

  it('returns false for a future date', () => {
    expect(isOverdue('2025-12-31T00:00:00.000Z')).toBe(false);
  });

  it('returns false for exactly now (same millisecond)', () => {
    // new Date(isoDate) === NOW — not strictly less than, so not overdue
    expect(isOverdue(NOW.toISOString())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isWithinDays
// ---------------------------------------------------------------------------
describe('isWithinDays', () => {
  it('returns true when date is exactly today (0 days away)', () => {
    expect(isWithinDays(NOW.toISOString(), 30)).toBe(true);
  });

  it('returns true when date is within the window', () => {
    const in15 = new Date('2025-06-30T12:00:00.000Z');
    expect(isWithinDays(in15.toISOString(), 30)).toBe(true);
  });

  it('returns true at exactly the boundary', () => {
    const in30 = new Date('2025-07-15T12:00:00.000Z');
    expect(isWithinDays(in30.toISOString(), 30)).toBe(true);
  });

  it('returns false when date is beyond the window', () => {
    const in31 = new Date('2025-07-16T12:00:00.000Z');
    expect(isWithinDays(in31.toISOString(), 30)).toBe(false);
  });

  it('returns false for overdue dates', () => {
    expect(isWithinDays('2025-06-01T00:00:00.000Z', 30)).toBe(false);
  });
});
