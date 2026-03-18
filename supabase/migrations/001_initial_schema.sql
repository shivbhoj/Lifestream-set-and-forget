-- ============================================================
-- Lifestream — Initial Schema
-- Run this in the Supabase SQL Editor for your project
-- ============================================================

-- ----------------------------------------------------------------
-- profiles (extends auth.users, auto-created on signup via trigger)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid references auth.users on delete cascade primary key,
  display_name         text,
  photo_url            text,
  timezone             text          default 'UTC',
  quiet_hours_start    time          default '22:00',
  quiet_hours_end      time          default '08:00',
  escalation_enabled   boolean       default true,
  notification_channels text[]       default array['push'],
  subscription         text          default 'free' check (subscription in ('free','pro')),
  onboarding_completed boolean       default false,
  selected_categories  text[]        default array[]::text[],
  created_at           timestamptz   default now(),
  updated_at           timestamptz   default now()
);

-- ----------------------------------------------------------------
-- reminders
-- ----------------------------------------------------------------
create table if not exists public.reminders (
  id                   uuid          primary key default gen_random_uuid(),
  user_id              uuid          references auth.users on delete cascade not null,
  title                text          not null,
  description          text,
  category             text          not null
    check (category in ('identity','vehicle','health','home','finance','legal','custom')),
  status               text          not null default 'active'
    check (status in ('active','snoozed','completed','expired')),
  item_start_date      timestamptz,
  expiration_date      timestamptz   not null,
  completed_at         timestamptz,
  reminder_intervals   int[]         default array[90,30,14,7,3,1],
  escalation_enabled   boolean       default true,
  next_notification_at timestamptz,
  last_notified_at     timestamptz,
  notification_count   int           default 0,
  snooze_until         timestamptz,
  snooze_count         int           default 0,
  max_snoozes          int           default 3,
  tags                 text[]        default array[]::text[],
  created_at           timestamptz   default now(),
  updated_at           timestamptz   default now()
);

-- ----------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------
create table if not exists public.audit_logs (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          references auth.users on delete set null,
  reminder_id    uuid          references public.reminders on delete set null,
  action         text          not null,
  changed_fields jsonb,
  actor_id       text,
  created_at     timestamptz   default now()
);

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.reminders    enable row level security;
alter table public.audit_logs   enable row level security;

-- Profiles: owner only
create policy "profiles_owner_all"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Reminders: owner only
create policy "reminders_owner_all"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Audit logs: owner read-only (writes happen server-side)
create policy "audit_logs_owner_read"
  on public.audit_logs for select
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- updated_at auto-update helper
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reminders_updated_at
  before update on public.reminders
  for each row execute procedure public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------
-- Auto-create profile when a new user signs up
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------
-- Index for fast reminder queries
-- ----------------------------------------------------------------
create index if not exists reminders_user_status_idx
  on public.reminders (user_id, status);

create index if not exists reminders_next_notification_idx
  on public.reminders (next_notification_at)
  where status = 'active';
