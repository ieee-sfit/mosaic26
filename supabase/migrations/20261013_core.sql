-- MOSAIC 26 core: registered players, kiosk-gated score submission, masked leaderboards.
-- Additive only. The lockdown of station_runs (revoke anon read/insert) is a separate migration.

create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

create table if not exists public.players (
  id varchar(6) primary key check (id ~ '^[0-9]{6}$'),
  name text not null,
  college text,
  year text,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

alter table public.station_runs add column if not exists client_run_id uuid unique;

create or replace function public._kiosk_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_secrets where key = 'kiosk_secret' and value = p_secret);
$$;
revoke all on function public._kiosk_ok(text) from public, anon, authenticated;

create or replace function public.check_players(p_secret text, p1 text, p2 text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record; b record; sa text; sb text;
begin
  if not public._kiosk_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK');
  end if;
  if p1 = p2 then
    return jsonb_build_object('ok', false, 'error', 'SAME_ID');
  end if;
  select * into a from public.players where id = p1;
  sa := case when not found then 'UNREGISTERED' when not a.paid then 'UNPAID' else 'OK' end;
  select * into b from public.players where id = p2;
  sb := case when not found then 'UNREGISTERED' when not b.paid then 'UNPAID' else 'OK' end;
  return jsonb_build_object(
    'ok', sa = 'OK' and sb = 'OK',
    'p1', jsonb_build_object('status', sa, 'name', split_part(coalesce(a.name, ''), ' ', 1)),
    'p2', jsonb_build_object('status', sb, 'name', split_part(coalesce(b.name, ''), ' ', 1))
  );
end $$;

create or replace function public.submit_run(
  p_secret text, p_client_run_id uuid, p1 text, p2 text, p_station text, p_raw int, p_time_left int
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public._kiosk_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK');
  end if;
  if p_station not in ('station1', 'station2', 'station3', 'station4') then
    return jsonb_build_object('ok', false, 'error', 'BAD_STATION');
  end if;
  if p1 = p2 or p_raw is null or p_raw < 0 or p_raw > 120
     or p_time_left is null or p_time_left < 0 or p_time_left > 720 then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;
  if (select count(*) from public.players where id in (p1, p2) and paid) <> 2 then
    return jsonb_build_object('ok', false, 'error', 'PLAYER_NOT_REGISTERED');
  end if;
  insert into public.station_runs (p1_id, p2_id, station_id, raw_score, time_left, client_run_id)
  values (p1, p2, p_station, p_raw, p_time_left, p_client_run_id)
  on conflict (client_run_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- Per-player / per-team standings. Final = (sum of best score per station) x coverage multiplier.
create or replace function public._mult(n int) returns numeric language sql immutable as $$
  select case n when 4 then 1.60 when 3 then 1.35 when 2 then 1.15 else 1.00 end;
$$;

create or replace function public.board_players(p_limit int default 50)
returns table (rank bigint, tag text, stations int, s1 int, s2 int, s3 int, s4 int, final int, time_total int)
language sql stable security definer set search_path = public as $$
  with pr as (
    select p1_id as pid, station_id, least(raw_score, 120) as raw, time_left from public.station_runs
    union all
    select p2_id, station_id, least(raw_score, 120), time_left from public.station_runs
  ), best as (
    select distinct on (pid, station_id) pid, station_id, raw, time_left
    from pr order by pid, station_id, raw desc, time_left desc
  ), agg as (
    select pid,
      count(*) filter (where raw > 0)::int as stations,
      coalesce(max(raw) filter (where station_id = 'station1'), 0)::int as s1,
      coalesce(max(raw) filter (where station_id = 'station2'), 0)::int as s2,
      coalesce(max(raw) filter (where station_id = 'station3'), 0)::int as s3,
      coalesce(max(raw) filter (where station_id = 'station4'), 0)::int as s4,
      sum(raw)::int as raw_total, sum(time_left)::int as time_total
    from best group by pid
  )
  select row_number() over (order by round(raw_total * public._mult(stations)) desc, time_total desc, pid),
         left(pid, 2) || '••' || right(pid, 2), stations, s1, s2, s3, s4,
         round(raw_total * public._mult(stations))::int, time_total
  from agg order by 1 limit greatest(least(p_limit, 200), 1);
$$;

create or replace function public.board_teams(p_limit int default 50)
returns table (rank bigint, tag1 text, tag2 text, stations int, s1 int, s2 int, s3 int, s4 int, final int, time_total int)
language sql stable security definer set search_path = public as $$
  with pr as (
    select least(p1_id, p2_id) as a, greatest(p1_id, p2_id) as b, station_id, least(raw_score, 120) as raw, time_left
    from public.station_runs
  ), best as (
    select distinct on (a, b, station_id) a, b, station_id, raw, time_left
    from pr order by a, b, station_id, raw desc, time_left desc
  ), agg as (
    select a, b,
      count(*) filter (where raw > 0)::int as stations,
      coalesce(max(raw) filter (where station_id = 'station1'), 0)::int as s1,
      coalesce(max(raw) filter (where station_id = 'station2'), 0)::int as s2,
      coalesce(max(raw) filter (where station_id = 'station3'), 0)::int as s3,
      coalesce(max(raw) filter (where station_id = 'station4'), 0)::int as s4,
      sum(raw)::int as raw_total, sum(time_left)::int as time_total
    from best group by a, b
  )
  select row_number() over (order by round(raw_total * public._mult(stations)) desc, time_total desc, a, b),
         left(a, 2) || '••' || right(a, 2), left(b, 2) || '••' || right(b, 2), stations, s1, s2, s3, s4,
         round(raw_total * public._mult(stations))::int, time_total
  from agg order by 1 limit greatest(least(p_limit, 200), 1);
$$;

-- Absolute individual standing for one ID (rank among all individual players), no PII.
create or replace function public.player_profile(p_id text)
returns table (rank bigint, total bigint, tag text, stations int, s1 int, s2 int, s3 int, s4 int,
               final int, time_total int, runs bigint, partners bigint)
language sql stable security definer set search_path = public as $$
  with pr as (
    select p1_id as pid, station_id, least(raw_score, 120) as raw, time_left from public.station_runs
    union all
    select p2_id, station_id, least(raw_score, 120), time_left from public.station_runs
  ), best as (
    select distinct on (pid, station_id) pid, station_id, raw, time_left
    from pr order by pid, station_id, raw desc, time_left desc
  ), agg as (
    select pid,
      count(*) filter (where raw > 0)::int as stations,
      coalesce(max(raw) filter (where station_id = 'station1'), 0)::int as s1,
      coalesce(max(raw) filter (where station_id = 'station2'), 0)::int as s2,
      coalesce(max(raw) filter (where station_id = 'station3'), 0)::int as s3,
      coalesce(max(raw) filter (where station_id = 'station4'), 0)::int as s4,
      sum(raw)::int as raw_total, sum(time_left)::int as time_total
    from best group by pid
  ), ranked as (
    select *, round(raw_total * public._mult(stations))::int as final,
           row_number() over (order by round(raw_total * public._mult(stations)) desc, time_total desc, pid) as rnk,
           count(*) over () as tot
    from agg
  )
  select rnk, tot, left(pid, 2) || '••' || right(pid, 2), stations, s1, s2, s3, s4, final, time_total,
         (select count(*) from public.station_runs where p1_id = p_id or p2_id = p_id),
         (select count(distinct case when p1_id = p_id then p2_id else p1_id end)
            from public.station_runs where p1_id = p_id or p2_id = p_id)
  from ranked where pid = p_id and p_id ~ '^[0-9]{6}$';
$$;

revoke all on function public.board_players(int), public.board_teams(int), public.player_profile(text) from public;
grant execute on function public.board_players(int), public.board_teams(int), public.player_profile(text) to anon, authenticated;
revoke all on function public.check_players(text, text, text), public.submit_run(text, uuid, text, text, text, int, int) from public;
grant execute on function public.check_players(text, text, text), public.submit_run(text, uuid, text, text, text, int, int) to anon, authenticated;
