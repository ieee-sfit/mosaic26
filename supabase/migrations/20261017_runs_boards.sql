-- MOSAIC 26 rebuild, part 2: kiosk RPCs (lookup / start_run / submit_run) and the ranking engine.
-- Scoring contract unchanged: 0..140 per run. CONSOLIDATED = sum over the four stations of the player's BEST run (max 560).
-- No multiplier anywhere.
-- NOT applied automatically.

-- Public board cache. Phones poll the boards constantly; the ranking is only recomputed after a write (run completed,
-- refund/void, window closed) or after 60 s. Bust = mark stale (the old value is still served while one session recomputes).
create table if not exists public.board_cache (
  key text primary key,
  value jsonb not null,
  computed_at timestamptz not null default now()
);
alter table public.board_cache enable row level security;
revoke all on public.board_cache from anon, authenticated;

create or replace function public._cache_bust()
returns void language sql security definer set search_path = public as $$
  update public.board_cache set computed_at = '-infinity';
$$;

-- Best run per (player, station) among COMPLETED runs, using the per-run chain:
-- score desc, hints asc, wrong asc, time_left desc, server finish time asc.
create or replace function public._best_runs(p_as_of timestamptz default null)
returns table (player_id text, station_id text, run_id uuid, raw_score int, hints int, wrong int, time_left int, finished_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (r.player_id, r.station_id)
         r.player_id::text, r.station_id, r.client_run_id, r.raw_score, coalesce(r.hints_used, 0), coalesce(r.wrong_attempts, 0),
         coalesce(r.time_left, 0), r.finished_at
  from public.station_runs r
  where r.state = 'completed' and (p_as_of is null or r.finished_at <= p_as_of)
  order by r.player_id, r.station_id, r.raw_score desc, coalesce(r.hints_used, 0), coalesce(r.wrong_attempts, 0),
           coalesce(r.time_left, 0) desc, r.finished_at, r.id;
$$;

-- Consolidated standings as of a moment (null = now). Tiebreakers, in order, from the best runs:
--   1 higher total  2 fewer hints  3 fewer wrong attempts  4 more total time_left  5 fewer total attempts used.
-- Players equal on all five share a rank (shared = true): no stable internal order is applied; the desk flips a coin live.
create or replace function public._ranked(p_as_of timestamptz default null)
returns table (player_id text, s1 int, s2 int, s3 int, s4 int, total int, hints int, wrong int, time_left int,
               attempts int, stations int, rnk bigint, shared boolean)
language sql stable security definer set search_path = public as $$
  with b as (select * from public._best_runs(p_as_of)),
  agg as (
    select player_id,
      coalesce(sum(raw_score) filter (where station_id = 'station1'), 0)::int as s1,
      coalesce(sum(raw_score) filter (where station_id = 'station2'), 0)::int as s2,
      coalesce(sum(raw_score) filter (where station_id = 'station3'), 0)::int as s3,
      coalesce(sum(raw_score) filter (where station_id = 'station4'), 0)::int as s4,
      sum(raw_score)::int as total, sum(hints)::int as hints, sum(wrong)::int as wrong, sum(time_left)::int as time_left,
      count(*) filter (where raw_score > 0)::int as stations
    from b group by player_id
  ),
  att as (
    select player_id::text as player_id, count(*)::int as n
    from public.station_runs
    where state in ('started', 'completed') and (p_as_of is null or started_at <= p_as_of)
    group by 1
  ),
  j as (
    select a.*, coalesce(t.n, 0) as attempts from agg a left join att t using (player_id)
  )
  select j.player_id, j.s1, j.s2, j.s3, j.s4, j.total, j.hints, j.wrong, j.time_left, j.attempts, j.stations,
         rank() over (order by j.total desc, j.hints, j.wrong, j.time_left desc, j.attempts),
         count(*) over (partition by j.total, j.hints, j.wrong, j.time_left, j.attempts) > 1
  from j;
$$;

-- ---------------------------------------------------------------------------------------------
-- Kiosk gate (unchanged contract): only lab PCs holding the secret may start credited runs.
create or replace function public._kiosk_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_secrets where key = 'kiosk_secret' and value = p_secret);
$$;
revoke all on function public._kiosk_ok(text) from public, anon, authenticated;

-- Runs that occupy a cap slot: started or completed (refunded / voided are excluded).
create or replace function public._runs_used(p_id text, p_station text)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.station_runs where player_id = p_id and station_id = p_station and state in ('started', 'completed');
$$;

create or replace function public._in_active_lobby(p_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lobby_players lp join public.lobbies l on l.id = lp.lobby_id
    where lp.player_id = p_id
      and ((l.state = 'open' and l.expires_at > now())
           or (l.state = 'running' and exists (select 1 from public.station_runs r where r.client_run_id = lp.run_id and r.state = 'started'))));
$$;

-- Status for a player on a station, without spending anything. p_id must already be locked or read-only use.
create or replace function public._player_status(p_id text, p_station text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare pl public.players; used int; bal int; cap int := public._cfg_int('attempt_cap'); st text;
begin
  if p_id is null or p_id !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'status', 'BAD_ID'); end if;
  select * into pl from public.players where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'status', 'NOT_REGISTERED'); end if;
  used := public._runs_used(p_id, p_station);
  bal := public._balance(p_id);
  st := case when used >= cap then 'CAP' when bal < 1 then 'NO_CREDITS' else 'OK' end;
  return jsonb_build_object('ok', st = 'OK', 'status', st, 'first_name', split_part(btrim(pl.name), ' ', 1),
    'college', pl.college, 'codename', pl.codename, 'balance', bal, 'runs_used', used, 'cap', cap);
end $$;

create or replace function public.kiosk_lookup(p_secret text, p_id text, p_station text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'status', 'UNAUTHORIZED_KIOSK'); end if;
  if p_station not in ('station1', 'station2', 'station3', 'station4') then
    return jsonb_build_object('ok', false, 'status', 'BAD_STATION');
  end if;
  r := public._player_status(p_id, p_station);
  if (r ->> 'status') = 'OK' and public._in_active_lobby(p_id) then
    r := r || jsonb_build_object('ok', false, 'status', 'IN_LOBBY');
  end if;
  return r;
end $$;

-- Charges one credit and creates the run row. Caller must hold the player row lock.
-- Returns null on success or an error code.
create or replace function public._charge_start(p_id text, p_station text, p_run uuid, p_lobby bigint)
returns text language plpgsql security definer set search_path = public as $$
begin
  if public._runs_used(p_id, p_station) >= public._cfg_int('attempt_cap') then return 'CAP'; end if;
  if public._balance(p_id) < 1 then return 'NO_CREDITS'; end if;
  insert into public.station_runs (player_id, station_id, client_run_id, lobby_id, state)
  values (p_id, p_station, p_run, p_lobby, 'started');
  insert into public.credit_ledger (player_id, delta, reason, run_id) values (p_id, -1, 'run_start', p_run);
  return null;
end $$;

-- Atomic, idempotent on client_run_id. Solo start (lobby runs are created by lobby_start).
create or replace function public.start_run(p_secret text, p_client_run_id uuid, p_id text, p_station text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pl public.players; r public.station_runs; err text; cap int := public._cfg_int('attempt_cap');
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  if p_station not in ('station1', 'station2', 'station3', 'station4') then return jsonb_build_object('ok', false, 'error', 'BAD_STATION'); end if;
  if p_client_run_id is null or p_id is null or p_id !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD'); end if;

  select * into pl from public.players where id = p_id for update;   -- serialises everything for this player
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_REGISTERED'); end if;

  select * into r from public.station_runs where client_run_id = p_client_run_id;
  if found then
    if r.player_id <> p_id or r.station_id <> p_station then return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD'); end if;
    if r.state in ('refunded', 'voided') then return jsonb_build_object('ok', false, 'error', 'RUN_VOID'); end if;
    return jsonb_build_object('ok', true, 'duplicate', true, 'run_id', r.client_run_id, 'balance', public._balance(p_id));
  end if;

  if public._in_active_lobby(p_id) then return jsonb_build_object('ok', false, 'error', 'IN_LOBBY'); end if;
  err := public._charge_start(p_id, p_station, p_client_run_id, null);
  if err is not null then return jsonb_build_object('ok', false, 'error', err, 'cap', cap); end if;
  return jsonb_build_object('ok', true, 'duplicate', false, 'run_id', p_client_run_id, 'balance', public._balance(p_id),
    'attempt_no', public._runs_used(p_id, p_station), 'cap', cap,
    'first_name', split_part(btrim(pl.name), ' ', 1), 'codename', pl.codename);
end $$;

-- Completes a started run. Idempotent: a second submit of a completed run changes nothing.
create or replace function public.submit_run(
  p_secret text, p_client_run_id uuid, p_id text, p_station text,
  p_raw int, p_time_left int, p_hints int, p_wrong int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.station_runs;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  if p_station not in ('station1', 'station2', 'station3', 'station4') then return jsonb_build_object('ok', false, 'error', 'BAD_STATION'); end if;
  if p_client_run_id is null or p_id is null or p_raw is null or p_raw < 0 or p_raw > 140
     or p_time_left is null or p_time_left < 0 or p_time_left > 720
     or p_hints is null or p_hints < 0 or p_hints > 500 or p_wrong is null or p_wrong < 0 or p_wrong > 5000 then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;

  select * into r from public.station_runs where client_run_id = p_client_run_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'RUN_NOT_FOUND'); end if;
  if r.player_id <> p_id or r.station_id <> p_station then return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD'); end if;
  if r.state = 'completed' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if r.state in ('refunded', 'voided') then return jsonb_build_object('ok', false, 'error', 'RUN_VOID'); end if;
  -- The play time claimed must fit inside the server-side elapsed time (30 s slack): blocks instant fabricated scores.
  if extract(epoch from (now() - r.started_at)) < (720 - p_time_left) - 30 then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;

  update public.station_runs
     set state = 'completed', raw_score = p_raw, time_left = p_time_left, hints_used = p_hints, wrong_attempts = p_wrong, finished_at = now()
   where id = r.id;
  perform public._cache_bust();
  if r.lobby_id is not null then perform public._lobby_try_finish(r.lobby_id); end if;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- End-screen standing: codename, rank and consolidated score. No PII.
create or replace function public.kiosk_standing(p_secret text, p_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare pl public.players; q record; n int;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  select * into pl from public.players where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_REGISTERED'); end if;
  select count(*) into n from public._ranked();
  select * into q from public._ranked() where player_id = p_id;
  if not found then
    return jsonb_build_object('ok', true, 'codename', pl.codename, 'total', 0, 'rank', null, 'of', n);
  end if;
  return jsonb_build_object('ok', true, 'codename', pl.codename, 'total', q.total, 'rank', q.rnk, 'shared', q.shared, 'of', n,
    's1', q.s1, 's2', q.s2, 's3', q.s3, 's4', q.s4);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Public boards (masked codenames only; never phone / PID / credits).
create or replace function public._board_overall_json()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank, x.codename), '[]'::jsonb) from (
    select q.rnk as rank, q.shared, p.codename, q.s1, q.s2, q.s3, q.s4, q.total, q.hints, q.wrong, q.time_left, q.attempts
    from public._ranked() q join public.players p on p.id = q.player_id
    order by q.rnk, p.codename limit 2000) x;
$$;

create or replace function public._board_station_json(p_station text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) from (
    select row_number() over (order by b.raw_score desc, b.hints, b.wrong, b.time_left desc, b.finished_at) as rank,
           p.codename, b.raw_score as score, b.hints, b.wrong, b.time_left, b.finished_at
    from public._best_runs() b join public.players p on p.id = b.player_id
    where b.station_id = p_station order by 1 limit 2000) x;
$$;

-- Returns the cached value for a key, recomputing it when stale. Only one session recomputes; the others serve the old value.
create or replace function public._cached(p_key text, p_lock int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb; fresh boolean; have boolean;
begin
  select value, computed_at > now() - interval '60 seconds', true into v, fresh, have from public.board_cache where key = p_key;
  if have and fresh then return v; end if;
  if have and not pg_try_advisory_xact_lock(p_lock) then return v; end if;   -- someone else is refreshing: serve the old value
  if not have then perform pg_advisory_xact_lock(p_lock); end if;
  v := case when p_key = 'overall' then public._board_overall_json() else public._board_station_json(substr(p_key, 9)) end;
  insert into public.board_cache (key, value, computed_at) values (p_key, v, now())
  on conflict (key) do update set value = excluded.value, computed_at = excluded.computed_at;
  return v;
end $$;

-- Pages of 100. rank is the global rank; total_rows lets the page show "page 1 of N".
create or replace function public.board_overall(p_limit int default 100, p_offset int default 0)
returns table (rank bigint, shared boolean, codename text, s1 int, s2 int, s3 int, s4 int, total int,
               hints int, wrong int, time_left int, attempts int, total_rows bigint)
language sql volatile security definer set search_path = public as $$
  with v as (select public._cached('overall', 7002) as j)
  select x.rank, x.shared, x.codename, x.s1, x.s2, x.s3, x.s4, x.total, x.hints, x.wrong, x.time_left, x.attempts, jsonb_array_length(v.j)::bigint
  from v, lateral jsonb_array_elements(v.j) with ordinality as e(el, n),
       lateral jsonb_to_record(e.el) as x(rank bigint, shared boolean, codename text, s1 int, s2 int, s3 int, s4 int,
                                          total int, hints int, wrong int, time_left int, attempts int)
  where e.n > greatest(coalesce(p_offset, 0), 0) and e.n <= greatest(coalesce(p_offset, 0), 0) + greatest(least(coalesce(p_limit, 100), 100), 1)
  order by e.n;
$$;

create or replace function public.board_station(p_station text, p_limit int default 100, p_offset int default 0)
returns table (rank bigint, codename text, score int, hints int, wrong int, time_left int, finished_at timestamptz, total_rows bigint)
language sql volatile security definer set search_path = public as $$
  with v as (select case when p_station in ('station1', 'station2', 'station3', 'station4')
                         then public._cached('station:' || p_station, 7003) else '[]'::jsonb end as j)
  select x.rank, x.codename, x.score, x.hints, x.wrong, x.time_left, x.finished_at, jsonb_array_length(v.j)::bigint
  from v, lateral jsonb_array_elements(v.j) with ordinality as e(el, n),
       lateral jsonb_to_record(e.el) as x(rank bigint, codename text, score int, hints int, wrong int, time_left int, finished_at timestamptz)
  where e.n > greatest(coalesce(p_offset, 0), 0) and e.n <= greatest(coalesce(p_offset, 0), 0) + greatest(least(coalesce(p_limit, 100), 100), 1)
  order by e.n;
$$;

create or replace function public.board_find(p_q text)
returns table (rank bigint, shared boolean, codename text, total int, of_players bigint)
language sql stable security definer set search_path = public as $$
  with r as (select * from public._ranked()), n as (select count(*) c from r)
  select r.rnk, r.shared, p.codename, r.total, n.c
  from r join public.players p on p.id = r.player_id cross join n
  where length(btrim(coalesce(p_q, ''))) >= 3 and p.codename ilike '%' || btrim(p_q) || '%'
  order by r.rnk limit 5;
$$;

-- Grants. Supabase grants EXECUTE to anon/authenticated by default, so revoke first, then allow explicitly.
revoke all on function public._cache_bust(), public._board_overall_json(), public._board_station_json(text), public._cached(text, int),
  public._best_runs(timestamptz), public._ranked(timestamptz), public._runs_used(text, text),
  public._in_active_lobby(text), public._player_status(text, text), public._charge_start(text, text, uuid, bigint)
  from public, anon, authenticated;
revoke all on function public.kiosk_lookup(text, text, text), public.start_run(text, uuid, text, text),
  public.submit_run(text, uuid, text, text, int, int, int, int), public.kiosk_standing(text, text),
  public.board_overall(int, int), public.board_station(text, int, int), public.board_find(text) from public, anon, authenticated;
grant execute on function public.kiosk_lookup(text, text, text), public.start_run(text, uuid, text, text),
  public.submit_run(text, uuid, text, text, int, int, int, int), public.kiosk_standing(text, text),
  public.board_overall(int, int), public.board_station(text, int, int), public.board_find(text) to anon, authenticated;
