import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Reminder, ReminderSection } from '../types';
import { isOverdue, isWithinDays } from '../utils/dates';

interface UseRemindersReturn {
  reminders: Reminder[];
  sections: ReminderSection[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReminders(userId: string | null): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchReminders = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'completed')
        .order('expiration_date', { ascending: true });

      if (fetchError) throw fetchError;
      setReminders((data as Reminder[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!userId) {
      setReminders([]);
      return;
    }

    fetchReminders();

    const channel = supabase
      .channel(`reminders:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReminders((prev) => {
              const incoming = payload.new as Reminder;
              if (incoming.status === 'completed') return prev;
              return [...prev, incoming].sort(
                (a, b) =>
                  new Date(a.expiration_date).getTime() -
                  new Date(b.expiration_date).getTime()
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            setReminders((prev) => {
              const updated = payload.new as Reminder;
              if (updated.status === 'completed') {
                return prev.filter((r) => r.id !== updated.id);
              }
              return prev
                .map((r) => (r.id === updated.id ? updated : r))
                .sort(
                  (a, b) =>
                    new Date(a.expiration_date).getTime() -
                    new Date(b.expiration_date).getTime()
                );
            });
          } else if (payload.eventType === 'DELETE') {
            setReminders((prev) =>
              prev.filter((r) => r.id !== (payload.old as Reminder).id)
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [userId, fetchReminders]);

  // Re-fetch when app comes back to foreground (catches expired status changes)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') fetchReminders();
    });
    return () => sub.remove();
  }, [fetchReminders]);

  // Compute dashboard sections
  const sections: ReminderSection[] = buildSections(reminders);

  return { reminders, sections, loading, error, refetch: fetchReminders };
}

function buildSections(reminders: Reminder[]): ReminderSection[] {
  const overdue: Reminder[] = [];
  const upcoming: Reminder[] = [];
  const later: Reminder[] = [];

  for (const r of reminders) {
    if (r.status === 'completed') continue;
    if (isOverdue(r.expiration_date)) {
      overdue.push(r);
    } else if (isWithinDays(r.expiration_date, 30)) {
      upcoming.push(r);
    } else {
      later.push(r);
    }
  }

  const sections: ReminderSection[] = [];
  if (overdue.length > 0) {
    sections.push({ title: 'Overdue', data: overdue, type: 'overdue' });
  }
  if (upcoming.length > 0) {
    sections.push({ title: 'Next 30 Days', data: upcoming, type: 'upcoming' });
  }
  if (later.length > 0) {
    sections.push({ title: 'Later', data: later, type: 'later' });
  }
  return sections;
}
