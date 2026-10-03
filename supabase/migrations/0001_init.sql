-- Cibu — Phase 6 schema (Supabase / Postgres). Every table is private per user via RLS.
-- Apply with:  supabase db push   (or paste into the Supabase SQL editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.cibu_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hunger real not null default 80 check (hunger between 0 and 100),
  energy real not null default 85 check (energy between 0 and 100),
  mood real not null default 70 check (mood between 0 and 100),
  hygiene real not null default 90 check (hygiene between 0 and 100),
  equipped_outfit text,
  updated_at timestamptz not null default now()
);

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  total_focus_min integer not null default 0,
  sessions integer not null default 0,
  streak integer not null default 0,
  last_focus_day date,
  updated_at timestamptz not null default now()
);

create type public.session_kind as enum ('focus', 'break');
create type public.session_outcome as enum ('completed', 'ended', 'skipped');

-- Source of truth for statistics; the client writes one row per finished block.
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.session_kind not null,
  planned_min integer not null check (planned_min > 0),
  actual_min integer not null check (actual_min >= 0),
  outcome public.session_outcome not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_started on public.focus_sessions (user_id, started_at desc);

create table if not exists public.inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  qty integer not null default 0 check (qty >= 0),
  primary key (user_id, item_key)
);

create table if not exists public.unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  unlock_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, unlock_key)
);

create table if not exists public.achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null,
  achieved_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  focus_min integer not null default 25,
  break_min integer not null default 5,
  long_break_min integer not null default 15,
  sound boolean not null default true,
  notify boolean not null default false,
  motion text not null default 'system' check (motion in ('system', 'full', 'reduced'))
);

-- Daily minutes per user (used by the Journal chart)
create or replace view public.daily_focus with (security_invoker = true) as
select user_id, (started_at at time zone 'UTC')::date as day, sum(actual_min)::int as minutes,
       count(*) filter (where outcome = 'completed')::int as sessions
from public.focus_sessions
where kind = 'focus'
group by 1, 2;

-- Row level security: a user can only see and change their own rows
do $$
declare t text;
begin
  foreach t in array array['cibu_state','progress','focus_sessions','inventory','unlocks','achievements','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- Create profile + default rows on sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.cibu_state (user_id) values (new.id);
  insert into public.progress (user_id) values (new.id);
  insert into public.settings (user_id) values (new.id);
  insert into public.inventory (user_id, item_key, qty) values (new.id, 'snack', 2), (new.id, 'drink', 1);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
