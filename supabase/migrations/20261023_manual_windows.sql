-- MOSAIC 26: window medals are awarded ONLY when the desk presses "Close & award". Nothing closes a window by itself.
-- Also: a preview of who would win, and an admin "re-open" for windows that were closed with no winners.

-- Guard: a closed window may be re-opened only when it has no results at all (nothing was awarded, so nothing changes).
create or replace function public._medal_windows_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.closed_at is not null then raise exception 'WINDOW_CLOSED'; end if;
    return old;
  end if;
  if old.closed_at is not null then
    if new.closed_at is null and new.starts_at = old.starts_at and new.ends_at = old.ends_at and new.medals_count = old.medals_count
       and new.label = old.label and not exists (select 1 from public.window_results where window_id = old.id) then
      return new;
    end if;
    if new.starts_at <> old.starts_at or new.ends_at <> old.ends_at or new.medals_count <> old.medals_count
       or new.closed_at is distinct from old.closed_at or new.label <> old.label then
      raise exception 'WINDOW_CLOSED';
    end if;
  end if;
  return new;
end $$;

-- Give back the windows that were closed automatically before this change and have no results.
update public.medal_windows set closed_at = null, toss_slots = 0
 where closed_at is not null and not exists (select 1 from public.window_results r where r.window_id = medal_windows.id);

-- Public read: never closes anything.
create or replace function public.public_windows()
returns jsonb language plpgsql security definer set search_path = public as $$
declare live public.medal_windows; leader jsonb := null; nxt public.medal_windows;
begin
  select * into live from public.medal_windows where starts_at <= now() and ends_at > now() order by starts_at limit 1;
  if found then
    select value into leader from public.board_cache where key = 'leader:' || live.id and computed_at > now() - interval '60 seconds';
    if not found then
      select jsonb_build_object('codename', p.codename, 'total', c.total, 'tied', c.grp > 1) into leader
      from public._window_candidates(live.id, now()) c join public.players p on p.id = c.player_id
      where c.crnk = 1 order by p.codename limit 1;
      insert into public.board_cache (key, value) values ('leader:' || live.id, coalesce(leader, 'null'::jsonb))
      on conflict (key) do update set value = excluded.value, computed_at = now();
    elsif leader = 'null'::jsonb then leader := null;
    end if;
  else
    select * into nxt from public.medal_windows where starts_at > now() order by starts_at limit 1;
  end if;
  return jsonb_build_object(
    'now', now(),
    'live', case when live.id is null then null else jsonb_build_object('id', live.id, 'label', live.label, 'starts_at', live.starts_at,
        'ends_at', live.ends_at, 'seconds_left', greatest(0, floor(extract(epoch from live.ends_at - now()))::int),
        'medals', live.medals_count, 'leader', leader) end,
    'next', case when nxt.id is null then null else jsonb_build_object('label', nxt.label, 'starts_at', nxt.starts_at) end,
    'windows', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label, 'starts_at', w.starts_at, 'ends_at', w.ends_at,
          'medals', w.medals_count, 'closed', w.closed_at is not null,
          'winners', coalesce((select jsonb_agg(jsonb_build_object('codename', p.codename, 'total', r.total, 'status', r.status) order by r.rnk, p.codename)
                               from public.window_results r join public.players p on p.id = r.player_id
                               where r.window_id = w.id and r.status in ('won', 'toss')), '[]'::jsonb))
        order by w.starts_at) from public.medal_windows w), '[]'::jsonb));
end $$;

create or replace function public.desk_windows()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_desk();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label, 'starts_at', w.starts_at, 'ends_at', w.ends_at,
        'medals', w.medals_count, 'closed', w.closed_at is not null, 'toss_slots', w.toss_slots, 'ended', w.ends_at <= now(),
        'results', coalesce((select jsonb_agg(jsonb_build_object('result_id', r.id, 'player_id', r.player_id, 'name', p.name,
                 'codename', p.codename, 'total', r.total, 'rank', r.rnk, 'status', r.status, 'claimed', r.claimed_at is not null)
                 order by r.rnk, p.name)
               from public.window_results r join public.players p on p.id = r.player_id where r.window_id = w.id), '[]'::jsonb))
      order by w.starts_at)
    from public.medal_windows w), '[]'::jsonb);
end $$;

create or replace function public.desk_medals_unclaimed()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_desk();
  return jsonb_build_object(
    'window', coalesce((select jsonb_agg(jsonb_build_object('result_id', r.id, 'player_id', r.player_id, 'name', p.name, 'college', p.college,
        'label', w.label, 'total', r.total) order by w.starts_at)
      from public.window_results r join public.medal_windows w on w.id = r.window_id join public.players p on p.id = r.player_id
      where r.status = 'won' and r.claimed_at is null), '[]'::jsonb),
    'match', coalesce((select jsonb_agg(jsonb_build_object('player_id', m.player_id, 'name', p.name, 'college', p.college,
        'station', m.station_id, 'raw', m.raw_score, 'lobby_id', m.lobby_id) order by m.awarded_at)
      from public.match_medals m join public.players p on p.id = m.player_id where m.claimed_at is null), '[]'::jsonb),
    'tosses', coalesce((select jsonb_agg(jsonb_build_object('window_id', w.id, 'label', w.label, 'slots', w.toss_slots,
        'players', (select jsonb_agg(jsonb_build_object('player_id', r.player_id, 'name', p.name)) from public.window_results r
                    join public.players p on p.id = r.player_id where r.window_id = w.id and r.status = 'toss')))
      from public.medal_windows w where exists (select 1 from public.window_results r where r.window_id = w.id and r.status = 'toss')), '[]'::jsonb));
end $$;

-- Close and award, in order: every ended, still-open window up to and including the chosen one (earlier windows first,
-- because a person can win only one window medal). Stops at a window whose predecessor has an unresolved coin toss.
create or replace function public.desk_close_window(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.medal_windows; x record;
begin
  perform public._require_desk();
  select * into w from public.medal_windows where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if w.closed_at is not null then return jsonb_build_object('ok', false, 'error', 'ALREADY_CLOSED'); end if;
  if w.ends_at > now() then return jsonb_build_object('ok', false, 'error', 'NOT_ENDED'); end if;
  perform pg_advisory_xact_lock(7001);
  for x in select id from public.medal_windows where closed_at is null and ends_at <= w.ends_at and ends_at <= now() order by ends_at, id loop
    exit when exists (select 1 from public.window_results where status = 'toss');
    perform public._close_one_window(x.id);
  end loop;
  select * into w from public.medal_windows where id = p_id;
  if w.closed_at is null then return jsonb_build_object('ok', false, 'error', 'RESOLVE_TOSS_FIRST'); end if;
  perform public._audit('window_close', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.desk_resolve_toss(p_window bigint, p_winners text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.medal_windows;
begin
  perform public._require_desk();
  select * into w from public.medal_windows where id = p_window for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if coalesce(array_length(p_winners, 1), 0) <> w.toss_slots
     or (select count(*) from public.window_results where window_id = p_window and status = 'toss' and player_id = any (p_winners)) <> w.toss_slots then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD', 'slots', w.toss_slots);
  end if;
  update public.window_results set status = case when player_id = any (p_winners) then 'won' else 'lost' end
   where window_id = p_window and status = 'toss';
  perform public._audit('window_toss', p_window::text, jsonb_build_object('winners', p_winners));
  return jsonb_build_object('ok', true);
end $$;

-- Preview: who would win this window if it were closed now (or at its end, if it has ended). Persists nothing.
create or replace function public.desk_window_preview(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.medal_windows;
begin
  perform public._require_desk();
  select * into w from public.medal_windows where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  return jsonb_build_object('ok', true, 'medals', w.medals_count, 'closed', w.closed_at is not null, 'candidates', coalesce((
    select jsonb_agg(jsonb_build_object('rank', c.crnk, 'player_id', c.player_id, 'name', p.name, 'college', p.college, 'codename', p.codename,
                                        'total', c.total, 'tied', c.grp > 1) order by c.crnk, p.name)
    from (select * from public._window_candidates(p_id, least(w.ends_at, now())) order by crnk limit 8) c
    join public.players p on p.id = c.player_id), '[]'::jsonb));
end $$;

-- Admin only: re-open a closed window that has no results (e.g. it was closed too early).
create or replace function public.admin_reopen_window(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if not exists (select 1 from public.medal_windows where id = p_id and closed_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'NOT_CLOSED');
  end if;
  if exists (select 1 from public.window_results where window_id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'HAS_RESULTS');
  end if;
  update public.medal_windows set closed_at = null, toss_slots = 0 where id = p_id;
  perform public._audit('window_reopen', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.public_windows(), public.desk_windows(), public.desk_medals_unclaimed(), public.desk_close_window(bigint),
  public.desk_resolve_toss(bigint, text[]), public.desk_window_preview(bigint), public.admin_reopen_window(bigint) from public, anon, authenticated;
grant execute on function public.public_windows() to anon, authenticated;
grant execute on function public.desk_windows(), public.desk_medals_unclaimed(), public.desk_close_window(bigint),
  public.desk_resolve_toss(bigint, text[]), public.desk_window_preview(bigint), public.admin_reopen_window(bigint) to authenticated;
