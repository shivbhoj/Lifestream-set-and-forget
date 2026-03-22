import * as Notifications from 'expo-notifications';
import type { Reminder } from '../types';
import { getAllFutureTriggers } from '../utils/intervals';

/**
 * Schedule all future local notifications for a reminder.
 * Should be called after creating or updating a reminder.
 */
export async function scheduleAllNotifications(reminder: Reminder): Promise<void> {
  // Cancel any existing notifications for this reminder first
  await cancelReminderNotifications(reminder.id);

  const expirationDate = new Date(reminder.expiration_date);
  const futureTriggers = getAllFutureTriggers(expirationDate, reminder.reminder_intervals);

  await Promise.all(
    futureTriggers.map(({ daysBeforeExpiry, triggerDate }) => {
      const { notifTitle, body } = buildCopy(reminder.title, daysBeforeExpiry);
      return Notifications.scheduleNotificationAsync({
        identifier: `${reminder.id}-${daysBeforeExpiry}d`,
        content: {
          title: notifTitle,
          body,
          data: { reminderId: reminder.id, daysBeforeExpiry },
          sound: 'default',
        },
        trigger: { date: triggerDate },
      });
    })
  );
}

/**
 * Cancel all scheduled local notifications for a specific reminder.
 */
export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) => n.identifier.startsWith(`${reminderId}-`));
  await Promise.all(
    toCancel.map((n) =>
      Notifications.cancelScheduledNotificationAsync(n.identifier)
    )
  );
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function buildCopy(
  title: string,
  days: number
): { notifTitle: string; body: string } {
  if (days <= 1) {
    return {
      notifTitle: `URGENT: ${title} expires tomorrow!`,
      body: 'This is your final reminder. Act now.',
    };
  }
  if (days <= 7) {
    return {
      notifTitle: `${title} — ${days} days left`,
      body: 'Getting urgent. Tap to review.',
    };
  }
  return {
    notifTitle: `Reminder: ${title}`,
    body: `Expires in ${days} days.`,
  };
}
