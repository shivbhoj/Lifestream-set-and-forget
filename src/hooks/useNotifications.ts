import { useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground notification display behaviour
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface UseNotificationsReturn {
  requestPermissions: () => Promise<boolean>;
  scheduleReminder: (
    reminderId: string,
    title: string,
    daysBeforeExpiry: number,
    triggerDate: Date
  ) => Promise<string>;
  cancelReminder: (reminderId: string) => Promise<void>;
  cancelAll: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  // Set up Android notification channels on mount
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const channels: Array<Notifications.NotificationChannelInput & { id: string }> = [
      {
        name: 'Urgent Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
        sound: 'default',
        id: 'lifestream_critical',
      },
      {
        name: 'Upcoming Deadlines',
        importance: Notifications.AndroidImportance.HIGH,
        id: 'lifestream_high',
      },
      {
        name: 'General Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        id: 'lifestream_normal',
      },
    ];

    channels.forEach((ch) => Notifications.setNotificationChannelAsync(ch.id, ch));
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });
    return status === 'granted';
  }, []);

  /**
   * Schedule a single local notification for a reminder.
   * Returns the Expo notification identifier.
   */
  const scheduleReminder = useCallback(
    async (
      reminderId: string,
      title: string,
      daysBeforeExpiry: number,
      triggerDate: Date
    ): Promise<string> => {
      const urgency = getUrgencyLevel(daysBeforeExpiry);
      const { notifTitle, body } = buildNotificationCopy(title, daysBeforeExpiry);

      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${reminderId}-${daysBeforeExpiry}d`,
        content: {
          title: notifTitle,
          body,
          data: { reminderId, daysBeforeExpiry },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId: `lifestream_${urgency}` }),
        },
        trigger: { date: triggerDate },
      });

      return id;
    },
    []
  );

  /**
   * Cancel all scheduled notifications for a given reminder ID.
   */
  const cancelReminder = useCallback(async (reminderId: string): Promise<void> => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) =>
      n.identifier.startsWith(`${reminderId}-`)
    );
    await Promise.all(
      toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  }, []);

  const cancelAll = useCallback(async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  return { requestPermissions, scheduleReminder, cancelReminder, cancelAll };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
type UrgencyLevel = 'critical' | 'high' | 'normal';

function getUrgencyLevel(daysBeforeExpiry: number): UrgencyLevel {
  if (daysBeforeExpiry <= 1) return 'critical';
  if (daysBeforeExpiry <= 7) return 'high';
  return 'normal';
}

function buildNotificationCopy(
  reminderTitle: string,
  days: number
): { notifTitle: string; body: string } {
  if (days <= 1) {
    return {
      notifTitle: `URGENT: ${reminderTitle} expires tomorrow!`,
      body: 'This is your final reminder. Act now.',
    };
  }
  if (days <= 7) {
    return {
      notifTitle: `${reminderTitle} — ${days} days left`,
      body: "This is getting urgent. Tap to review.",
    };
  }
  return {
    notifTitle: `Reminder: ${reminderTitle}`,
    body: `Expires in ${days} days.`,
  };
}
