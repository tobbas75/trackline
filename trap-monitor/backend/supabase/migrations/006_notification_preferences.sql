-- ── Notification Preferences & Enhanced Notifications
-- Extends the notifications table for in-app use and adds user notification preferences

-- Extend notifications table with in-app fields
alter table public.notifications add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notifications add column if not exists read boolean default false;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists body text;

-- Create notification preferences table
create table if not exists public.notification_preferences (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  org_id        uuid not null references public.organisations(id) on delete cascade,
  trap_catch    boolean default true,
  unit_offline  boolean default true,
  low_battery   boolean default true,
  email_enabled boolean default false,
  email_address text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, org_id)
);

-- Enable RLS on notification_preferences
alter table public.notification_preferences enable row level security;

-- RLS policy: users manage their own preferences
create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Grant execute to authenticated users to query preferences
grant select, insert, update on public.notification_preferences to authenticated;

-- Create index on user_id + org_id for faster lookups
create index if not exists idx_notification_preferences_user_org 
  on public.notification_preferences(user_id, org_id);

-- Update notifications table RLS to allow users to read their own notifications
drop policy if exists "Members can view org notifications" on public.notifications;
drop policy if exists "Service role can manage notifications" on public.notifications;

create policy "Users read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Service role insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'service_role');

create policy "Service role update notifications"
  on public.notifications for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Grant permissions
grant select, update on public.notifications to authenticated;

-- Enable realtime on notifications
alter publication supabase_realtime add table public.notifications;

-- Create helper function to get user's notification preferences for an org
create or replace function public.get_user_notification_preferences(p_org_id uuid)
returns public.notification_preferences
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.notification_preferences
  where user_id = auth.uid() and org_id = p_org_id
  limit 1;
$$;

grant execute on function public.get_user_notification_preferences(uuid) to authenticated;
