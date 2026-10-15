-- MOSAIC 26 rebuild, part 1: solo players, config, credit ledger, committee, lockdown.
-- Replaces the team-of-2 model, the coverage multiplier and the paid flag. Nothing is deleted or dropped here.
-- NOT applied automatically. Review, then apply by hand after sign-off.

-- 1. Retire the pre-event test data (3 test players, 20 test runs). The old tables are renamed and locked: no grants for
--    anon/authenticated, so nothing in the app or the public API can read them. Drop them whenever convenient:
--      drop table public.legacy_station_runs_test; drop table public.legacy_players_test;
alter table public.players rename to legacy_players_test;
alter table public.station_runs rename to legacy_station_runs_test;
revoke all on public.legacy_players_test, public.legacy_station_runs_test from anon, authenticated;

-- 2. Old public read paths (teams, multiplier, raw runs) are closed. They are revoked rather than dropped; drop them later.
revoke all on public.leaderboard_standings from anon, authenticated;
revoke all on function public.board_players(int), public.board_teams(int), public.player_profile(text),
  public.check_players(text, text, text), public.check_players_for(text, text, text, text),
  public.submit_run(text, uuid, text, text, text, int, int), public._mult(int) from public, anon, authenticated;

-- 3. Config (price, cap, thresholds). Editable by the desk/SQL without a rebuild.
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

insert into public.app_config (key, value) values
  ('price_inr',            '70'::jsonb),
  ('attempt_cap',          '10'::jsonb),
  ('match_medal_min_raw',  '70'::jsonb),
  ('lobby_min_players',    '2'::jsonb),
  ('lobby_max_players',    '5'::jsonb),
  ('lobby_ttl_minutes',    '10'::jsonb),
  ('lobby_countdown_secs', '6'::jsonb),
  ('desk_hours', '[{"date":"2026-10-16","from":"09:30","to":"17:30"},{"date":"2026-10-17","from":"09:30","to":"13:30"}]'::jsonb)
on conflict (key) do nothing;

create or replace function public._cfg_int(p_key text)
returns int language sql stable security definer set search_path = public as $$
  select (value #>> '{}')::int from public.app_config where key = p_key;
$$;

-- 4. Players: 4-digit system-generated ID, contact + class details, masked codename.
create table public.players (
  id varchar(4) primary key check (id ~ '^[0-9]{4}$'),
  name text not null check (length(btrim(name)) > 0),
  college text not null,
  year text not null check (length(btrim(year)) > 0),
  department text not null check (length(btrim(department)) > 0),
  phone text not null check (phone ~ '^[0-9]{10}$'),
  is_internal boolean not null default false,
  pid text,
  notes text,
  codename text not null,
  registered_by uuid,
  created_at timestamptz not null default now()
);
create unique index players_phone_uq on public.players (phone);
create unique index players_pid_uq on public.players (lower(pid)) where pid is not null and btrim(pid) <> '';
create unique index players_codename_uq on public.players (codename);
create index players_name_idx on public.players (lower(name));
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

-- 5. Runs: solo, created when a run STARTS, completed later by submit_run.
create table public.station_runs (
  id uuid primary key default gen_random_uuid(),
  player_id varchar(4) not null references public.players (id),
  station_id text not null check (station_id in ('station1', 'station2', 'station3', 'station4')),
  state text not null default 'started' check (state in ('started', 'completed', 'refunded', 'voided')),
  raw_score int check (raw_score is null or (raw_score >= 0 and raw_score <= 140)),
  time_left int check (time_left is null or (time_left >= 0 and time_left <= 720)),
  hints_used int check (hints_used is null or hints_used >= 0),
  wrong_attempts int check (wrong_attempts is null or wrong_attempts >= 0),
  lobby_id bigint,
  client_run_id uuid not null unique,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz default now()
);
create index station_runs_player_station_idx on public.station_runs (player_id, station_id, state);
create index station_runs_finished_idx on public.station_runs (finished_at) where finished_at is not null;
create index station_runs_lobby_idx on public.station_runs (lobby_id) where lobby_id is not null;
alter table public.station_runs enable row level security;
revoke all on public.station_runs from anon, authenticated;

-- 6. Committee (desk users) and audit log.
create table if not exists public.committee_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null default 'desk' check (role in ('desk', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.committee_members enable row level security;
revoke all on public.committee_members from anon, authenticated;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  subject text,
  detail jsonb
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

create or replace function public._audit(p_action text, p_subject text, p_detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor, action, subject, detail) values (auth.uid(), p_action, p_subject, p_detail);
$$;

create or replace function public._is_desk()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.committee_members where user_id = auth.uid() and active);
$$;

create or replace function public._require_desk()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public._is_desk() then
    raise exception 'NOT_COMMITTEE' using errcode = '42501';
  end if;
end $$;

-- 7. Credit ledger. Balance = sum(delta).
create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  player_id varchar(4) not null references public.players (id),
  delta int not null check (delta <> 0),
  amount_inr int check (amount_inr is null or amount_inr >= 0),
  mode text check (mode is null or mode in ('cash', 'upi', 'online')),
  payment_ref text,
  received_by_name text,
  desk_user uuid,
  reason text not null,
  run_id uuid,
  request_id uuid unique,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_player_idx on public.credit_ledger (player_id);
create index if not exists credit_ledger_created_idx on public.credit_ledger (created_at);
create unique index if not exists credit_ledger_run_uq on public.credit_ledger (run_id, reason) where run_id is not null;
alter table public.credit_ledger enable row level security;
revoke all on public.credit_ledger from anon, authenticated;

create or replace function public._balance(p_id text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where player_id = p_id;
$$;

-- 8. Codename + ID generation (never typed by hand).
create or replace function public._new_codename()
returns text language plpgsql volatile set search_path = public as $$
declare
  adj text[] := array['IRON','NEON','VANTA','COBALT','SOLAR','GHOST','APEX','ROGUE','LUNAR','ZENITH','EMBER','VOID',
                      'ARCTIC','CRIMSON','DELTA','ECHO','FROST','GAMMA','HELIX','ION','JADE','KILO','NOVA','ONYX'];
  noun text[] := array['FALCON','SPECTRE','RAVEN','COMET','VIPER','WARDEN','PILOT','ORBIT','LYNX','BEACON','DRIFTER','SENTINEL',
                       'COBRA','DRAGON','EAGLE','FOX','GRIFFIN','HAWK','JAGUAR','KRAKEN','MANTIS','PHANTOM','RANGER','TITAN'];
  c text; i int := 0;
begin
  loop
    c := adj[1 + floor(random() * array_length(adj, 1))::int] || ' ' || noun[1 + floor(random() * array_length(noun, 1))::int];
    i := i + 1;
    if i > 8 then c := c || ' ' || (10 + floor(random() * 90))::int; end if;
    exit when not exists (select 1 from public.players where codename = c);
    if i > 60 then raise exception 'CODENAME_SPACE_EXHAUSTED'; end if;
  end loop;
  return c;
end $$;

create or replace function public._norm_phone(p text)
returns text language sql immutable as $$
  select case
    when length(d) = 12 and d like '91%' then substr(d, 3)
    when length(d) = 11 and d like '0%' then substr(d, 2)
    else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s;
$$;

revoke all on function public._cfg_int(text), public._audit(text, text, jsonb), public._is_desk(), public._require_desk(),
  public._balance(text), public._new_codename(), public._norm_phone(text) from public, anon, authenticated;

-- 9. Lobby tables (RPCs live in 20261020). Declared here because runs reference lobbies.
create table if not exists public.counters (
  key text primary key,
  value bigint not null
);
alter table public.counters enable row level security;
revoke all on public.counters from anon, authenticated;
insert into public.counters (key, value) values ('lobby_number', 0) on conflict (key) do nothing;

create table if not exists public.lobbies (
  id bigint generated always as identity primary key,
  number int not null check (number between 1 and 9999),
  station_id text not null check (station_id in ('station1', 'station2', 'station3', 'station4')),
  creator_id varchar(4) not null references public.players (id),
  state text not null default 'open' check (state in ('open', 'running', 'finished', 'cancelled', 'expired')),
  seed bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  start_at timestamptz,
  finished_at timestamptz,
  cancelled_by uuid,
  cancel_reason text
);
-- A number is unique among ACTIVE lobbies only.
create unique index if not exists lobbies_active_number_uq on public.lobbies (number) where state in ('open', 'running');
create index if not exists lobbies_state_idx on public.lobbies (state, expires_at);
alter table public.lobbies enable row level security;
revoke all on public.lobbies from anon, authenticated;

create table if not exists public.lobby_players (
  lobby_id bigint not null references public.lobbies (id) on delete cascade,
  player_id varchar(4) not null references public.players (id),
  joined_at timestamptz not null default now(),
  run_id uuid,
  primary key (lobby_id, player_id)
);
create index if not exists lobby_players_player_idx on public.lobby_players (player_id);
alter table public.lobby_players enable row level security;
revoke all on public.lobby_players from anon, authenticated;

alter table public.station_runs
  add constraint station_runs_lobby_fk foreign key (lobby_id) references public.lobbies (id);

-- One match medal per person per station. Different record type from window medals.
create table if not exists public.match_medals (
  player_id varchar(4) not null references public.players (id),
  station_id text not null,
  lobby_id bigint not null references public.lobbies (id),
  raw_score int not null,
  awarded_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid,
  primary key (player_id, station_id)
);
alter table public.match_medals enable row level security;
revoke all on public.match_medals from anon, authenticated;
