-- Notification preferences: per-user channel + per-type mute settings
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  muted_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users view own prefs"
  on public.notification_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own prefs"
  on public.notification_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own prefs"
  on public.notification_preferences for update
  to authenticated
  using (auth.uid() = user_id);

-- Auto-create prefs row on signup
create or replace function public.create_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_create_notif_prefs on auth.users;
create trigger on_auth_user_create_notif_prefs
  after insert on auth.users
  for each row execute function public.create_notification_prefs();

-- Backfill for existing users
insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Updated_at trigger
create or replace function public.touch_notif_prefs()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists touch_notif_prefs_trg on public.notification_preferences;
create trigger touch_notif_prefs_trg
  before update on public.notification_preferences
  for each row execute function public.touch_notif_prefs();

-- Gate notification inserts based on prefs (in-app channel + muted types)
create or replace function public.respect_notification_prefs()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  select in_app_enabled, muted_types into p
  from public.notification_preferences where user_id = new.user_id;
  if not found then
    return new;
  end if;
  if not p.in_app_enabled then return null; end if;
  if new.type = any(p.muted_types) then return null; end if;
  return new;
end;
$$;

drop trigger if exists respect_notification_prefs_trg on public.notifications;
create trigger respect_notification_prefs_trg
  before insert on public.notifications
  for each row execute function public.respect_notification_prefs();