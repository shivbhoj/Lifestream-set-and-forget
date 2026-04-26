import {
  getReminder,
  getReminders,
  createReminder,
  updateReminder,
  completeReminder,
  snoozeReminder,
  deleteReminder,
} from '../services/reminders';
import type { Reminder, CreateReminderInput } from '../types';

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
// Variables referenced in jest.mock() factories must have the "mock" prefix.
const mockQueryBuilder = {
  select: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  order: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  single: jest.fn(),
};

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NOW = new Date('2025-06-15T12:00:00.000Z');

function resetChain() {
  // resetAllMocks clears both call records AND once queues, so re-apply
  // base implementations afterwards for fluent chaining.
  const { supabase } = require('../lib/supabase');
  (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);
  Object.keys(mockQueryBuilder).forEach((key) => {
    (mockQueryBuilder as Record<string, jest.Mock>)[key].mockReturnValue(mockQueryBuilder);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  jest.resetAllMocks(); // clears once queues AND call records
  resetChain();
});

afterEach(() => {
  jest.useRealTimers();
});

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'reminder-1',
    user_id: 'user-1',
    title: 'Passport',
    description: null,
    category: 'identity',
    status: 'active',
    item_start_date: null,
    expiration_date: '2025-12-31T12:00:00.000Z',
    completed_at: null,
    reminder_intervals: [180, 90, 60, 30, 14, 7, 3, 1],
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
// getReminder
// ---------------------------------------------------------------------------
describe('getReminder', () => {
  it('returns the reminder on success', async () => {
    const reminder = makeReminder();
    mockQueryBuilder.single.mockResolvedValueOnce({ data: reminder, error: null });

    const result = await getReminder('reminder-1');
    expect(result).toEqual(reminder);
  });

  it('throws when Supabase returns an error', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await expect(getReminder('bad-id')).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// getReminders
// ---------------------------------------------------------------------------
describe('getReminders', () => {
  it('returns reminders array on success', async () => {
    const reminders = [makeReminder({ id: '1' }), makeReminder({ id: '2' })];
    mockQueryBuilder.order.mockResolvedValueOnce({ data: reminders, error: null });

    const result = await getReminders('user-1');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when data is null', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: null });

    const result = await getReminders('user-1');
    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    mockQueryBuilder.order.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    await expect(getReminders('user-1')).rejects.toThrow('DB error');
  });
});

// ---------------------------------------------------------------------------
// createReminder
// ---------------------------------------------------------------------------
describe('createReminder', () => {
  const input: CreateReminderInput = {
    title: 'Passport',
    category: 'identity',
    expiration_date: new Date('2025-12-31T12:00:00.000Z'), // 199 days away
  };

  it('inserts with correct intervals and next_notification_at', async () => {
    const created = makeReminder();
    mockQueryBuilder.single.mockResolvedValueOnce({ data: created, error: null });

    const result = await createReminder('user-1', input);
    expect(result).toEqual(created);

    const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
    expect(insertCall).toMatchObject({ user_id: 'user-1', title: 'Passport', status: 'active' });
    expect(Array.isArray(insertCall.reminder_intervals)).toBe(true);
    expect(insertCall.reminder_intervals.length).toBeGreaterThan(0);
    expect(typeof insertCall.next_notification_at).toBe('string');
  });

  it('throws when the insert fails', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert failed' },
    });

    await expect(createReminder('user-1', input)).rejects.toThrow('Insert failed');
  });

  it('sets next_notification_at to null when expiry is already past', async () => {
    const expiredInput: CreateReminderInput = {
      title: 'Old Passport',
      category: 'identity',
      expiration_date: new Date('2025-01-01T12:00:00.000Z'),
    };
    const created = makeReminder({ expiration_date: '2025-01-01T12:00:00.000Z' });
    mockQueryBuilder.single.mockResolvedValueOnce({ data: created, error: null });

    await createReminder('user-1', expiredInput);

    const insertCall = mockQueryBuilder.insert.mock.calls[0][0];
    expect(insertCall.next_notification_at).toBeNull();
    expect(insertCall.reminder_intervals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateReminder
// ---------------------------------------------------------------------------
describe('updateReminder', () => {
  it('recomputes intervals when expiration_date changes', async () => {
    const existing = makeReminder();
    // updateReminder fetches the existing record first, then does the update
    mockQueryBuilder.single
      .mockResolvedValueOnce({ data: existing, error: null })  // getReminder
      .mockResolvedValueOnce({ data: existing, error: null }); // update result

    await updateReminder('user-1', 'reminder-1', {
      expiration_date: new Date('2026-06-15T12:00:00.000Z'),
    });

    const updateCall = mockQueryBuilder.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty('expiration_date');
    expect(updateCall).toHaveProperty('reminder_intervals');
    expect(updateCall).toHaveProperty('next_notification_at');
  });

  it('does NOT recompute intervals when only title changes', async () => {
    const existing = makeReminder();
    mockQueryBuilder.single.mockResolvedValueOnce({ data: existing, error: null });

    await updateReminder('user-1', 'reminder-1', { title: 'New Title' });

    const updateCall = mockQueryBuilder.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty('title', 'New Title');
    expect(updateCall).not.toHaveProperty('expiration_date');
    expect(updateCall).not.toHaveProperty('reminder_intervals');
  });

  it('throws when the update fails', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    });

    await expect(
      updateReminder('user-1', 'reminder-1', { title: 'X' })
    ).rejects.toThrow('Update failed');
  });
});

// ---------------------------------------------------------------------------
// completeReminder
// ---------------------------------------------------------------------------
describe('completeReminder', () => {
  it('sets status to completed and records completed_at', async () => {
    const completed = makeReminder({ status: 'completed', completed_at: NOW.toISOString() });
    mockQueryBuilder.single.mockResolvedValueOnce({ data: completed, error: null });

    const result = await completeReminder('user-1', 'reminder-1');
    expect(result.status).toBe('completed');
    expect(result.completed_at).toBe(NOW.toISOString());

    const updateCall = mockQueryBuilder.update.mock.calls[0][0];
    expect(updateCall.status).toBe('completed');
    expect(updateCall.completed_at).toBe(NOW.toISOString());
  });

  it('throws when Supabase returns an error', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Complete failed' },
    });

    await expect(completeReminder('user-1', 'reminder-1')).rejects.toThrow('Complete failed');
  });
});

// ---------------------------------------------------------------------------
// snoozeReminder
// ---------------------------------------------------------------------------
describe('snoozeReminder', () => {
  it('increments snooze_count and sets snooze_until', async () => {
    const existing = makeReminder({ snooze_count: 1 });
    const snoozed = makeReminder({ snooze_count: 2, status: 'snoozed' });
    mockQueryBuilder.single
      .mockResolvedValueOnce({ data: existing, error: null }) // getReminder
      .mockResolvedValueOnce({ data: snoozed, error: null }); // update result

    const result = await snoozeReminder('user-1', 'reminder-1', 24);

    const updateCall = mockQueryBuilder.update.mock.calls[0][0];
    expect(updateCall.status).toBe('snoozed');
    expect(updateCall.snooze_count).toBe(2);

    const expectedSnoozeUntil = new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString();
    expect(updateCall.snooze_until).toBe(expectedSnoozeUntil);
    expect(updateCall.next_notification_at).toBe(expectedSnoozeUntil);
    expect(result).toEqual(snoozed);
  });

  it('throws when the update fails', async () => {
    const existing = makeReminder();
    mockQueryBuilder.single
      .mockResolvedValueOnce({ data: existing, error: null }) // getReminder
      .mockResolvedValueOnce({ data: null, error: { message: 'Snooze failed' } }); // update

    await expect(snoozeReminder('user-1', 'reminder-1', 8)).rejects.toThrow('Snooze failed');
  });
});

// ---------------------------------------------------------------------------
// deleteReminder
// ---------------------------------------------------------------------------
describe('deleteReminder', () => {
  it('deletes without error on success', async () => {
    // delete chain: .delete().eq('id').eq('user_id')
    // The first .eq() returns the builder for chaining; the second is the terminal call.
    mockQueryBuilder.eq
      .mockReturnValueOnce(mockQueryBuilder)               // first .eq('id', id)
      .mockResolvedValueOnce({ error: null });              // second .eq('user_id', userId)

    await expect(deleteReminder('user-1', 'reminder-1')).resolves.toBeUndefined();
  });

  it('writes audit log before deleting', async () => {
    const { supabase } = require('../lib/supabase');
    mockQueryBuilder.eq
      .mockReturnValueOnce(mockQueryBuilder)
      .mockResolvedValueOnce({ error: null });

    await deleteReminder('user-1', 'reminder-1');

    // supabase.from should have been called with 'audit_logs' before 'reminders'
    const fromCalls = (supabase.from as jest.Mock).mock.calls.map((c: string[][]) => c[0]);
    const auditIdx = fromCalls.indexOf('audit_logs');
    const remindersDeleteIdx = fromCalls.lastIndexOf('reminders');
    expect(auditIdx).toBeLessThan(remindersDeleteIdx);
  });

  it('throws when the delete fails', async () => {
    mockQueryBuilder.eq
      .mockReturnValueOnce(mockQueryBuilder)
      .mockResolvedValueOnce({ error: { message: 'Delete failed' } });

    await expect(deleteReminder('user-1', 'reminder-1')).rejects.toThrow('Delete failed');
  });
});
