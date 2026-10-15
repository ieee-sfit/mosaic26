-- MOSAIC 26 rebuild, part 5: versus lobbies. 2..5 players, one station, one run each, same seed, synchronised countdown.
-- No realtime dependency: clients poll lobby_status every 2 s.
-- NOT applied automatically.

-- Leaving a lobby (or being dropped at start) is recorded with left_at; rows are never deleted.
alter table public.lobby_players add column if not exists left_at timestamptz;

create or replace function public._in_active_lobby(p_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lobby_players lp join public.lobbies l on l.id = lp.lobby_id
    where lp.player_id = p_id and lp.left_at is null
      and ((l.state = 'open' and l.expires_at > now())
           or (l.state = 'running' and exists (select 1 from public.station_runs r where r.client_run_id = lp.run_id and r.state = 'started'))));
$$;
revoke all on function public._in_active_lobby(text) from public, anon, authenticated;

alter table public.lobbies
  add column if not exists winner_id varchar(4) references public.players (id),
  add column if not exists medal_awarded boolean;

-- Expire unstarted lobbies (10 min) and settle stale running ones (12 min play + 2 min grace).
create or replace function public._lobby_housekeeping()
returns void language plpgsql security definer set search_path = public as $$
declare l record;
begin
  update public.lobbies set state = 'expired' where state = 'open' and expires_at <= now();
  for l in select id from public.lobbies where state = 'running' and start_at + interval '840 seconds' < now() loop
    perform public._lobby_finalize(l.id);
  end loop;
end $$;

-- Ranking of one lobby by the per-run chain: score, hints, wrong, time_left, server finish time.
create or replace function public._lobby_ranking(p_lobby bigint)
returns table (rank bigint, player_id text, raw_score int, hints int, wrong int, time_left int, finished_at timestamptz)
language sql stable security definer set search_path = public as $$
  select row_number() over (order by r.raw_score desc, coalesce(r.hints_used, 0), coalesce(r.wrong_attempts, 0),
                                     coalesce(r.time_left, 0) desc, r.finished_at, r.id),
         r.player_id::text, r.raw_score, coalesce(r.hints_used, 0), coalesce(r.wrong_attempts, 0), coalesce(r.time_left, 0), r.finished_at
  from public.station_runs r where r.lobby_id = p_lobby and r.state = 'completed';
$$;

create or replace function public._lobby_finalize(p_lobby bigint)
returns void language plpgsql security definer set search_path = public as $$
declare l public.lobbies; w record; awarded boolean := false; min_raw int := public._cfg_int('match_medal_min_raw'); n int;
begin
  select * into l from public.lobbies where id = p_lobby for update;
  if not found or l.state <> 'running' then return; end if;
  select * into w from public._lobby_ranking(p_lobby) where rank = 1;
  if found and w.raw_score >= min_raw then
    insert into public.match_medals (player_id, station_id, lobby_id, raw_score) values (w.player_id, l.station_id, p_lobby, w.raw_score)
    on conflict (player_id, station_id) do nothing;
    get diagnostics n = row_count;
    awarded := n = 1;      -- one match medal per person per station
  end if;
  update public.lobbies set state = 'finished', finished_at = now(), winner_id = w.player_id, medal_awarded = awarded where id = p_lobby;
end $$;

create or replace function public._lobby_try_finish(p_lobby bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.lobby_players lp join public.station_runs r on r.client_run_id = lp.run_id
                 where lp.lobby_id = p_lobby and r.state = 'started') then
    perform public._lobby_finalize(p_lobby);
  end if;
end $$;

-- Zero-padded to at least 3 digits (001 .. 999), then plain 4 digits (1000 .. 9999). lpad() would truncate 4-digit numbers.
create or replace function public._lobby_text(n int)
returns text language sql immutable as $$ select case when n < 100 then lpad(n::text, 3, '0') else n::text end; $$;

create or replace function public._lobby_next_number()
returns int language plpgsql security definer set search_path = public as $$
declare v bigint; num int; i int := 0;
begin
  loop
    update public.counters set value = value + 1 where key = 'lobby_number' returning value into v;
    num := ((v - 1) % 9999)::int + 1;
    exit when not exists (select 1 from public.lobbies where number = num and state in ('open', 'running'));
    i := i + 1;
    if i > 9999 then raise exception 'LOBBY_NUMBERS_EXHAUSTED'; end if;
  end loop;
  return num;
end $$;

create or replace function public.lobby_create(p_secret text, p_id text, p_station text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare st jsonb; num int; lid bigint; exp timestamptz;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  if p_station not in ('station1', 'station2', 'station3', 'station4') then return jsonb_build_object('ok', false, 'error', 'BAD_STATION'); end if;
  perform public._lobby_housekeeping();
  perform 1 from public.players where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_REGISTERED'); end if;
  st := public._player_status(p_id, p_station);
  if (st ->> 'status') <> 'OK' then return jsonb_build_object('ok', false, 'error', st ->> 'status'); end if;
  if public._in_active_lobby(p_id) then return jsonb_build_object('ok', false, 'error', 'IN_LOBBY'); end if;
  num := public._lobby_next_number();
  exp := now() + make_interval(mins => public._cfg_int('lobby_ttl_minutes'));
  insert into public.lobbies (number, station_id, creator_id, expires_at) values (num, p_station, p_id, exp) returning id into lid;
  insert into public.lobby_players (lobby_id, player_id) values (lid, p_id);
  return jsonb_build_object('ok', true, 'lobby_id', lid, 'number', num, 'number_text', public._lobby_text(num), 'expires_at', exp);
end $$;

create or replace function public.lobby_join(p_secret text, p_id text, p_number int, p_station text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lobbies; st jsonb;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  if p_station not in ('station1', 'station2', 'station3', 'station4') or p_number is null or p_number < 1 or p_number > 9999 then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;
  perform public._lobby_housekeeping();
  perform 1 from public.players where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_REGISTERED'); end if;
  select * into l from public.lobbies where number = p_number and state in ('open', 'running') for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'LOBBY_NOT_FOUND'); end if;
  if l.station_id <> p_station then return jsonb_build_object('ok', false, 'error', 'WRONG_STATION', 'station', l.station_id); end if;
  if exists (select 1 from public.lobby_players where lobby_id = l.id and player_id = p_id and left_at is null) and l.state = 'open' then
    return jsonb_build_object('ok', true, 'lobby_id', l.id, 'number', l.number, 'duplicate', true);
  end if;
  if l.state <> 'open' then return jsonb_build_object('ok', false, 'error', 'LOBBY_STARTED'); end if;
  if public._in_active_lobby(p_id) then return jsonb_build_object('ok', false, 'error', 'IN_LOBBY'); end if;
  st := public._player_status(p_id, p_station);
  if (st ->> 'status') <> 'OK' then return jsonb_build_object('ok', false, 'error', st ->> 'status'); end if;
  if (select count(*) from public.lobby_players where lobby_id = l.id and left_at is null) >= public._cfg_int('lobby_max_players') then
    return jsonb_build_object('ok', false, 'error', 'LOBBY_FULL');
  end if;
  insert into public.lobby_players (lobby_id, player_id) values (l.id, p_id)
  on conflict (lobby_id, player_id) do update set left_at = null, joined_at = now();
  return jsonb_build_object('ok', true, 'lobby_id', l.id, 'number', l.number, 'duplicate', false);
end $$;

create or replace function public.lobby_leave(p_secret text, p_id text, p_lobby bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lobbies;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  select * into l from public.lobbies where id = p_lobby for update;
  if not found or l.state <> 'open' then return jsonb_build_object('ok', true); end if;
  if l.creator_id = p_id then
    update public.lobbies set state = 'cancelled', cancel_reason = 'creator left', finished_at = now() where id = p_lobby;
  else
    update public.lobby_players set left_at = now() where lobby_id = p_lobby and player_id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lobby_status(p_secret text, p_lobby bigint, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lobbies; mine public.lobby_players; res jsonb;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  perform public._lobby_housekeeping();
  select * into l from public.lobbies where id = p_lobby;
  if not found then return jsonb_build_object('ok', false, 'error', 'LOBBY_NOT_FOUND'); end if;
  select * into mine from public.lobby_players where lobby_id = p_lobby and player_id = p_id and left_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_IN_LOBBY', 'state', l.state); end if;
  if l.state = 'running' then perform public._lobby_try_finish(p_lobby); select * into l from public.lobbies where id = p_lobby; end if;
  if l.state = 'finished' then
    select jsonb_agg(jsonb_build_object('rank', q.rank, 'first_name', split_part(btrim(p.name), ' ', 1), 'codename', p.codename,
        'score', q.raw_score, 'hints', q.hints, 'wrong', q.wrong, 'time_left', q.time_left, 'is_you', q.player_id = p_id) order by q.rank)
      into res from public._lobby_ranking(p_lobby) q join public.players p on p.id = q.player_id;
  end if;
  return jsonb_build_object('ok', true, 'state', l.state, 'number', l.number, 'number_text', public._lobby_text(l.number),
    'station', l.station_id, 'is_creator', l.creator_id = p_id, 'server_now', now(), 'expires_at', l.expires_at,
    'start_at', l.start_at, 'seed', l.seed, 'run_id', mine.run_id, 'cancel_reason', l.cancel_reason,
    'min_players', public._cfg_int('lobby_min_players'), 'max_players', public._cfg_int('lobby_max_players'),
    'players', (select jsonb_agg(jsonb_build_object('first_name', split_part(btrim(p.name), ' ', 1), 'college', p.college,
                  'is_creator', p.id = l.creator_id, 'is_you', p.id = p_id) order by lp.joined_at)
                from public.lobby_players lp join public.players p on p.id = lp.player_id where lp.lobby_id = p_lobby and lp.left_at is null),
    'results', res, 'winner_is_you', l.winner_id = p_id, 'medal_awarded', coalesce(l.medal_awarded, false) and l.winner_id = p_id);
end $$;

-- START: creator only, min players, same seed for all, everyone charged one credit atomically.
create or replace function public.lobby_start(p_secret text, p_lobby bigint, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lobbies; v_p text; st jsonb; dropped text[] := '{}'; rid uuid; err text; n int;
        v_seed bigint := floor(random() * 2147483646)::bigint + 1; start_ts timestamptz;
begin
  if not public._kiosk_ok(p_secret) then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK'); end if;
  perform public._lobby_housekeeping();
  select * into l from public.lobbies where id = p_lobby for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'LOBBY_NOT_FOUND'); end if;
  if l.creator_id <> p_id then return jsonb_build_object('ok', false, 'error', 'NOT_CREATOR'); end if;
  if l.state = 'running' then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if l.state <> 'open' then return jsonb_build_object('ok', false, 'error', 'LOBBY_' || upper(l.state)); end if;

  -- Lock players in id order (no deadlocks), drop anyone who can no longer pay / is capped.
  for v_p in select player_id from public.lobby_players where lobby_id = p_lobby and left_at is null order by player_id loop
    perform 1 from public.players where id = v_p for update;
    st := public._player_status(v_p, l.station_id);
    if (st ->> 'status') <> 'OK' then
      dropped := dropped || v_p;
      update public.lobby_players set left_at = now() where lobby_id = p_lobby and player_id = v_p;
    end if;
  end loop;
  select count(*) into n from public.lobby_players where lobby_id = p_lobby and left_at is null;
  if n < public._cfg_int('lobby_min_players') then
    -- roll the drops back: raise so nothing is half-applied, caller sees TOO_FEW
    raise exception 'LOBBY_TOO_FEW:%', n using errcode = 'P0001';
  end if;

  for v_p in select player_id from public.lobby_players where lobby_id = p_lobby and left_at is null order by player_id loop
    rid := gen_random_uuid();
    err := public._charge_start(v_p, l.station_id, rid, p_lobby);
    if err is not null then raise exception 'LOBBY_CHARGE_FAILED:%', err using errcode = 'P0001'; end if;
    update public.lobby_players set run_id = rid where lobby_id = p_lobby and player_id = v_p;
  end loop;

  start_ts := now() + make_interval(secs => public._cfg_int('lobby_countdown_secs'));
  update public.lobbies set state = 'running', seed = v_seed, start_at = start_ts where id = p_lobby;
  return jsonb_build_object('ok', true, 'start_at', start_ts, 'seed', v_seed, 'players', n, 'dropped', to_jsonb(dropped));
exception when others then
  if sqlerrm like 'LOBBY_TOO_FEW:%' then
    return jsonb_build_object('ok', false, 'error', 'TOO_FEW_PLAYERS', 'min', public._cfg_int('lobby_min_players'));
  end if;
  raise;
end $$;

-- Desk: list active lobbies and cancel an unstarted one.
create or replace function public.desk_lobbies()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_desk();
  perform public._lobby_housekeeping();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', l.id, 'number_text', public._lobby_text(l.number), 'station', l.station_id, 'state', l.state,
        'created_at', l.created_at, 'expires_at', l.expires_at, 'start_at', l.start_at, 'winner', (select name from public.players where id = l.winner_id),
        'medal_awarded', l.medal_awarded, 'cancel_reason', l.cancel_reason,
        'players', (select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by lp.joined_at)
                    from public.lobby_players lp join public.players p on p.id = lp.player_id where lp.lobby_id = l.id and lp.left_at is null))
      order by (l.state in ('open', 'running')) desc, l.created_at desc)
    from (select * from public.lobbies order by (state in ('open', 'running')) desc, created_at desc limit 40) l), '[]'::jsonb);
end $$;

create or replace function public.desk_cancel_lobby(p_lobby bigint, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.lobbies;
begin
  perform public._require_desk();
  select * into l from public.lobbies where id = p_lobby for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'LOBBY_NOT_FOUND'); end if;
  if l.state = 'running' then return jsonb_build_object('ok', false, 'error', 'ALREADY_RUNNING'); end if;
  if l.state <> 'open' then return jsonb_build_object('ok', false, 'error', 'NOT_ACTIVE'); end if;
  update public.lobbies set state = 'cancelled', cancelled_by = auth.uid(), cancel_reason = coalesce(nullif(btrim(p_reason), ''), 'cancelled by desk'),
         finished_at = now() where id = p_lobby;
  perform public._audit('cancel_lobby', p_lobby::text, jsonb_build_object('reason', p_reason));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._lobby_housekeeping(), public._lobby_ranking(bigint), public._lobby_finalize(bigint),
  public._lobby_try_finish(bigint), public._lobby_next_number(), public._lobby_text(int) from public, anon, authenticated;
revoke all on function public.lobby_create(text, text, text), public.lobby_join(text, text, int, text), public.lobby_leave(text, text, bigint),
  public.lobby_status(text, bigint, text), public.lobby_start(text, bigint, text), public.desk_lobbies(), public.desk_cancel_lobby(bigint, text)
  from public, anon, authenticated;
grant execute on function public.lobby_create(text, text, text), public.lobby_join(text, text, int, text), public.lobby_leave(text, text, bigint),
  public.lobby_status(text, bigint, text), public.lobby_start(text, bigint, text) to anon, authenticated;
grant execute on function public.desk_lobbies(), public.desk_cancel_lobby(bigint, text) to authenticated;
