// Prevent supabase.ts → expo-secure-store → expo-modules-core from loading
// in a test that only exercises pure section-building logic.
jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { buildSections } from '../hooks/useReminders';
import type { Reminder } from '../types';

const NOW = new Date('2025-06-15T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

function makeReminder(overrides: Partial<Reminder> & { expiration_date: string }): Reminder {
  return {
    id: 'test-id',
    user_id: 'user-1',
    title: 'Test',
    description: null,
    category: 'health',
    status: 'active',
    item_start_date: null,
    completed_at: null,
    reminder_intervals: [7, 1],
    escalation_enabled: false,
    next_notification_at: null,
    last_notified_at: null,
    notification_count: 0,
    snooze_until: null,
    snooze_count: 0,
    max_snoozes: 3,
    tags: [],
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Empty / null input
// ---------------------------------------------------------------------------
describe('buildSections', () => {
  it('returns empty array for no reminders', () => {
    expect(buildSections([])).toEqual([]);
  });

  it('omits sections that have no reminders', () => {
    const r = makeReminder({ id: '1', expiration_date: '2025-06-20T12:00:00.000Z' }); // 5 days away
    const sections = buildSections([r]);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('upcoming');
  });

  // ---------------------------------------------------------------------------
  // Section assignment
  // ---------------------------------------------------------------------------
  it('puts overdue reminders in the "overdue" section', () => {
    const r = makeReminder({ id: '1', expiration_date: '2025-06-01T12:00:00.000Z' });
    const sections = buildSections([r]);
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe('overdue');
    expect(sections[0].title).toBe('Overdue');
    expect(sections[0].data).toContain(r);
  });

  it('puts reminders expiring within 30 days in "upcoming"', () => {
    const r = makeReminder({ id: '1', expiration_date: '2025-07-10T12:00:00.000Z' }); // 25 days away
    const sections = buildSections([r]);
    expect(sections[0].type).toBe('upcoming');
    expect(sections[0].title).toBe('Next 30 Days');
  });

  it('puts reminders expiring exactly on day 30 in "upcoming"', () => {
    const r = makeReminder({ id: '1', expiration_date: '2025-07-15T12:00:00.000Z' }); // 30 days away
    const sections = buildSections([r]);
    expect(sections[0].type).toBe('upcoming');
  });

  it('puts reminders beyond 30 days in "later"', () => {
    const r = makeReminder({ id: '1', expiration_date: '2025-09-01T12:00:00.000Z' }); // 77 days away
    const sections = buildSections([r]);
    expect(sections[0].type).toBe('later');
    expect(sections[0].title).toBe('Later');
  });

  it('excludes completed reminders', () => {
    const r = makeReminder({
      id: '1',
      expiration_date: '2025-06-01T12:00:00.000Z',
      status: 'completed',
    });
    expect(buildSections([r])).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Section ordering
  // ---------------------------------------------------------------------------
  it('always orders sections as overdue → upcoming → later', () => {
    const overdue = makeReminder({ id: '1', expiration_date: '2025-06-01T12:00:00.000Z' });
    const upcoming = makeReminder({ id: '2', expiration_date: '2025-06-20T12:00:00.000Z' });
    const later = makeReminder({ id: '3', expiration_date: '2025-09-01T12:00:00.000Z' });

    const sections = buildSections([later, upcoming, overdue]);
    expect(sections[0].type).toBe('overdue');
    expect(sections[1].type).toBe('upcoming');
    expect(sections[2].type).toBe('later');
  });

  it('includes all three sections when each has data', () => {
    const overdue = makeReminder({ id: '1', expiration_date: '2025-06-01T12:00:00.000Z' });
    const upcoming = makeReminder({ id: '2', expiration_date: '2025-06-20T12:00:00.000Z' });
    const later = makeReminder({ id: '3', expiration_date: '2025-09-01T12:00:00.000Z' });

    expect(buildSections([overdue, upcoming, later])).toHaveLength(3);
  });

  // ---------------------------------------------------------------------------
  // Mixed statuses
  // ---------------------------------------------------------------------------
  it('includes snoozed reminders (they are not completed)', () => {
    const snoozed = makeReminder({
      id: '1',
      expiration_date: '2025-06-20T12:00:00.000Z',
      status: 'snoozed',
    });
    const sections = buildSections([snoozed]);
    expect(sections).toHaveLength(1);
    expect(sections[0].data).toContain(snoozed);
  });

  it('multiple reminders in same section are all present', () => {
    const r1 = makeReminder({ id: '1', expiration_date: '2025-06-16T12:00:00.000Z' });
    const r2 = makeReminder({ id: '2', expiration_date: '2025-06-20T12:00:00.000Z' });
    const sections = buildSections([r1, r2]);
    expect(sections).toHaveLength(1);
    expect(sections[0].data).toHaveLength(2);
  });
});
