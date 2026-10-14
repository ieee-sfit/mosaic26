-- Raise the raw score ceiling from 120 to 140 (base 100 + speed bonus 20 + optional Module D 20).
-- Only the limit changes: submit_run (latest definition, from 20261014_attempt_cap.sql) and the three leaderboard
-- functions (definitions from 20261013_core.sql). Table, grants and every other function are untouched.
-- NOT applied automatically: review, then apply by hand.

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
  if p1 = p2 or p_raw is null or p_raw < 0 or p_raw > 140
     or p_time_left is null or p_time_left < 0 or p_time_left > 720 then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;
  if (select count(*) from public.players where id in (p1, p2) and paid) <> 2 then
    return jsonb_build_object('ok', false, 'error', 'PLAYER_NOT_REGISTERED');
  end if;
  if exists (select 1 from public.station_runs where client_run_id = p_client_run_id) then
    return jsonb_build_object('ok', true);
  end if;
  if (select count(*) from public.station_runs where station_id = p_station and (p1_id = p1 or p2_id = p1)) >= 4
     or (select count(*) from public.station_runs where station_id = p_station and (p1_id = p2 or p2_id = p2)) >= 4 then
    return jsonb_build_object('ok', false, 'error', 'ATTEMPT_LIMIT');
  end if;
  insert into public.station_runs (p1_id, p2_id, station_id, raw_score, time_left, client_run_id)
  values (p1, p2, p_station, p_raw, p_time_left, p_client_run_id)
  on conflict (client_run_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.board_players(p_limit int default 50)
returns table (rank bigint, tag text, stations int, s1 int, s2 int, s3 int, s4 int, final int, time_total int)
language sql stable security definer set search_path = public as $$
  with pr as (
    select p1_id as pid, station_id, least(raw_score, 140) as raw, time_left from public.station_runs
    union all
    select p2_id, station_id, least(raw_score, 140), time_left from public.station_runs
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
    select least(p1_id, p2_id) as a, greatest(p1_id, p2_id) as b, station_id, least(raw_score, 140) as raw, time_left
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

create or replace function public.player_profile(p_id text)
returns table (rank bigint, total bigint, tag text, stations int, s1 int, s2 int, s3 int, s4 int,
               final int, time_total int, runs bigint, partners bigint)
language sql stable security definer set search_path = public as $$
  with pr as (
    select p1_id as pid, station_id, least(raw_score, 140) as raw, time_left from public.station_runs
    union all
    select p2_id, station_id, least(raw_score, 140), time_left from public.station_runs
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
revoke all on function public.submit_run(text, uuid, text, text, text, int, int) from public;
grant execute on function public.submit_run(text, uuid, text, text, text, int, int) to anon, authenticated;
