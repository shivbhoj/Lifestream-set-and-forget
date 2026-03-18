import { supabase } from '../lib/supabase';
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '../types';
import { generateIntervals, calculateNextNotificationAt } from '../utils/intervals';
import { daysBetween } from '../utils/dates';

// ----------------------------------------------------------------
// Fetch
// ----------------------------------------------------------------
export async function getReminder(id: string): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Reminder;
}

export async function getReminders(userId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('expiration_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Reminder[]) ?? [];
}

// ----------------------------------------------------------------
// Create
// ----------------------------------------------------------------
export async function createReminder(
  userId: string,
  input: CreateReminderInput
): Promise<Reminder> {
  const expDate = input.expiration_date;
  const daysUntilExpiry = daysBetween(new Date(), expDate);
  const intervals = generateIntervals(input.category, daysUntilExpiry);
  const nextNotificationAt = calculateNextNotificationAt(expDate, intervals);

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      expiration_date: expDate.toISOString(),
      item_start_date: input.item_start_date?.toISOString() ?? null,
      reminder_intervals: intervals,
      next_notification_at: nextNotificationAt?.toISOString() ?? null,
      tags: input.tags ?? [],
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(userId, (data as Reminder).id, 'created');

  return data as Reminder;
}

// ----------------------------------------------------------------
// Update
// ----------------------------------------------------------------
export async function updateReminder(
  userId: string,
  id: string,
  input: UpdateReminderInput
): Promise<Reminder> {
  const patch: Partial<Reminder> & Record<string, unknown> = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.category !== undefined) patch.category = input.category;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.item_start_date !== undefined) {
    patch.item_start_date = input.item_start_date?.toISOString() ?? null;
  }

  if (input.expiration_date !== undefined || input.category !== undefined) {
    // Re-compute intervals and next notification
    const existing = await getReminder(id);
    const expDate = input.expiration_date ?? new Date(existing.expiration_date);
    const category = input.category ?? existing.category;
    const daysUntilExpiry = daysBetween(new Date(), expDate);
    const intervals = generateIntervals(category, daysUntilExpiry);
    const nextNotificationAt = calculateNextNotificationAt(expDate, intervals);

    patch.expiration_date = expDate.toISOString();
    patch.reminder_intervals = intervals;
    patch.next_notification_at = nextNotificationAt?.toISOString() ?? null;
  }

  const { data, error } = await supabase
    .from('reminders')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(userId, id, 'updated');

  return data as Reminder;
}

// ----------------------------------------------------------------
// Complete
// ----------------------------------------------------------------
export async function completeReminder(userId: string, id: string): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(userId, id, 'completed');

  return data as Reminder;
}

// ----------------------------------------------------------------
// Snooze
// ----------------------------------------------------------------
export async function snoozeReminder(
  userId: string,
  id: string,
  hours: number
): Promise<Reminder> {
  const existing = await getReminder(id);
  const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  const newSnoozeCount = existing.snooze_count + 1;

  const { data, error } = await supabase
    .from('reminders')
    .update({
      status: 'snoozed',
      snooze_until: snoozeUntil.toISOString(),
      snooze_count: newSnoozeCount,
      next_notification_at: snoozeUntil.toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit(userId, id, 'snoozed');

  return data as Reminder;
}

// ----------------------------------------------------------------
// Delete
// ----------------------------------------------------------------
export async function deleteReminder(userId: string, id: string): Promise<void> {
  await logAudit(userId, id, 'deleted');

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------
// Audit log helper
// ----------------------------------------------------------------
async function logAudit(
  userId: string,
  reminderId: string,
  action: string
): Promise<void> {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    reminder_id: reminderId,
    action,
    actor_id: userId,
  });
}
