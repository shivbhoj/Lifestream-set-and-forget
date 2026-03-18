// ----------------------------------------------------------------
// Reminder category
// ----------------------------------------------------------------
export type ReminderCategory =
  | 'identity'   // passport, license, ID
  | 'vehicle'    // registration, insurance, inspection
  | 'health'     // prescriptions, checkups, vaccinations
  | 'home'       // lease, appliances, HVAC, warranties
  | 'finance'    // subscriptions, taxes, credit cards
  | 'legal'      // contracts, wills
  | 'custom';

export type ReminderStatus = 'active' | 'snoozed' | 'completed' | 'expired';

export type NotificationChannel = 'push' | 'email' | 'sms';

export type SubscriptionTier = 'free' | 'pro';

// ----------------------------------------------------------------
// Database row types (snake_case, matches Supabase columns)
// ----------------------------------------------------------------
export interface Profile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  timezone: string;
  quiet_hours_start: string;   // "22:00"
  quiet_hours_end: string;     // "08:00"
  escalation_enabled: boolean;
  notification_channels: NotificationChannel[];
  subscription: SubscriptionTier;
  onboarding_completed: boolean;
  selected_categories: ReminderCategory[];
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: ReminderCategory;
  status: ReminderStatus;
  item_start_date: string | null;    // ISO timestamp
  expiration_date: string;           // ISO timestamp
  completed_at: string | null;
  reminder_intervals: number[];      // days before expiry
  escalation_enabled: boolean;
  next_notification_at: string | null;
  last_notified_at: string | null;
  notification_count: number;
  snooze_until: string | null;
  snooze_count: number;
  max_snoozes: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  reminder_id: string | null;
  action: AuditAction;
  changed_fields: Record<string, { before: unknown; after: unknown }> | null;
  actor_id: string | null;
  created_at: string;
}

export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'snoozed'
  | 'completed'
  | 'shared'
  | 'notified';

// ----------------------------------------------------------------
// Form types (used in UI)
// ----------------------------------------------------------------
export interface CreateReminderInput {
  title: string;
  description?: string;
  category: ReminderCategory;
  expiration_date: Date;
  item_start_date?: Date;
  tags?: string[];
}

export interface UpdateReminderInput {
  title?: string;
  description?: string;
  category?: ReminderCategory;
  expiration_date?: Date;
  item_start_date?: Date;
  tags?: string[];
}

// ----------------------------------------------------------------
// UI helpers
// ----------------------------------------------------------------
export interface ReminderSection {
  title: string;
  data: Reminder[];
  type: 'overdue' | 'upcoming' | 'later' | 'completed';
}

export const CATEGORY_LABELS: Record<ReminderCategory, string> = {
  identity: 'Identity',
  vehicle: 'Vehicle',
  health: 'Health',
  home: 'Home',
  finance: 'Finance',
  legal: 'Legal',
  custom: 'Custom',
};

export const CATEGORY_ICONS: Record<ReminderCategory, string> = {
  identity: '🪪',
  vehicle: '🚗',
  health: '🏥',
  home: '🏠',
  finance: '💳',
  legal: '⚖️',
  custom: '📌',
};

export const ALL_CATEGORIES: ReminderCategory[] = [
  'identity',
  'vehicle',
  'health',
  'home',
  'finance',
  'legal',
  'custom',
];
