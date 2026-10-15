-- MOSAIC 26 rebuild, part 4: window medals (the gold rush). Windows are rows the desk can edit; no rebuild needed.
-- NOT applied automatically.

create table if not exists public.medal_windows (
  id bigint generated always as identity primary key,
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  medals_count int not null default 1 check (medals_count >= 0),
  toss_slots int not null default 0,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists medal_windows_ends_idx on public.medal_windows (ends_at);
alter table public.medal_windows enable row level security;
revoke all on public.medal_windows from anon, authenticated;

create table if not exists public.window_results (
  id bigint generated always as identity primary key,
  window_id bigint not null references public.medal_windows (id),
  player_id varchar(4) not null references public.players (id),
  rnk bigint not null,
  total int not null,
  status text not null check (status in ('won', 'toss', 'lost')),
  claimed_at timestamptz,
  claimed_by uuid,
  created_at timestamptz not null default now(),
  unique (window_id, player_id)
);
-- A person can win only one window medal overall.
create unique index if not exists window_results_one_win_uq on public.window_results (player_id) where status = 'won';
alter table public.window_results enable row level security;
revoke all on public.window_results from anon, authenticated;

-- Persisted results never change: only claim fields and toss resolution (toss -> won/lost) may be updated; no deletes.
create or replace function public._window_results_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'WINDOW_RESULTS_IMMUTABLE'; end if;
  if new.window_id <> old.window_id or new.player_id <> old.player_id or new.rnk <> old.rnk or new.total <> old.total then
    raise exception 'WINDOW_RESULTS_IMMUTABLE';
  end if;
  if new.status <> old.status and old.status <> 'toss' then raise exception 'WINDOW_RESULTS_IMMUTABLE'; end if;
  return new;
end $$;
create or replace trigger window_results_guard before update or delete on public.window_results
  for each row execute function public._window_results_guard();

create or replace function public._medal_windows_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.closed_at is not null then raise exception 'WINDOW_CLOSED'; end if;
    return old;
  end if;
  if old.closed_at is not null and (new.starts_at <> old.starts_at or new.ends_at <> old.ends_at
      or new.medals_count <> old.medals_count or new.closed_at is distinct from old.closed_at or new.label <> old.label) then
    raise exception 'WINDOW_CLOSED';
  end if;
  return new;
end $$;
create or replace trigger medal_windows_guard before update or delete on public.medal_windows
  for each row execute function public._medal_windows_guard();

-- Seed (IST). Day 1 = 2026-10-16, Day 2 = 2026-10-17. One medal each; raise medals_count if more medals are bought.
-- Day 1: 10:00-12:00 every 15 min (8), 12:00-17:00 hourly (5). Day 2: 10:00-11:00 every 15 min (4), 11:00-13:00 hourly (2).
insert into public.medal_windows (label, starts_at, ends_at, medals_count)
select d || ' ' || to_char(s at time zone 'Asia/Kolkata', 'HH24:MI') || '-' || to_char((s + e) at time zone 'Asia/Kolkata', 'HH24:MI'), s, s + e, 1
from (
  select 'D1' as d, g as s, interval '15 minutes' as e from generate_series(timestamptz '2026-10-16 10:00:00+05:30', timestamptz '2026-10-16 11:45:00+05:30', interval '15 minutes') g
  union all
  select 'D1', g, interval '1 hour' from generate_series(timestamptz '2026-10-16 12:00:00+05:30', timestamptz '2026-10-16 16:00:00+05:30', interval '1 hour') g
  union all
  select 'D2', g, interval '15 minutes' from generate_series(timestamptz '2026-10-17 10:00:00+05:30', timestamptz '2026-10-17 10:45:00+05:30', interval '15 minutes') g
  union all
  select 'D2', g, interval '1 hour' from generate_series(timestamptz '2026-10-17 11:00:00+05:30', timestamptz '2026-10-17 12:00:00+05:30', interval '1 hour') g
) x
where not exists (select 1 from public.medal_windows);

-- Ranked candidates of a window: finished at least one run inside it, ranked by consolidated total as of p_as_of
-- (tiebreak chain), skipping anyone who already holds a window medal.
create or replace function public._window_candidates(p_window bigint, p_as_of timestamptz)
returns table (player_id text, total int, hints int, wrong int, time_left int, attempts int, crnk bigint, grp bigint)
language sql stable security definer set search_path = public as $$
  with w as (select * from public.medal_windows where id = p_window),
  c as (
    select r.* from public._ranked(p_as_of) r, w
    where exists (select 1 from public.station_runs x
                  where x.player_id = r.player_id and x.state = 'completed'
                    and x.finished_at >= w.starts_at and x.finished_at < w.ends_at and x.finished_at <= p_as_of)
      and not exists (select 1 from public.window_results wr where wr.player_id = r.player_id and wr.status = 'won'
                      and wr.window_id <> p_window)
  )
  select c.player_id, c.total, c.hints, c.wrong, c.time_left, c.attempts,
         rank() over (order by c.total desc, c.hints, c.wrong, c.time_left desc, c.attempts),
         count(*) over (partition by c.total, c.hints, c.wrong, c.time_left, c.attempts)
  from c;
$$;

create or replace function public._close_one_window(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare w public.medal_windows; remaining int; rk record;
begin
  select * into w from public.medal_windows where id = p_id for update;
  if not found or w.closed_at is not null or w.ends_at > now() then return; end if;
  remaining := w.medals_count;
  for rk in select crnk, max(grp) as g from public._window_candidates(p_id, w.ends_at) group by crnk order by crnk loop
    exit when remaining <= 0;
    if rk.g <= remaining then
      insert into public.window_results (window_id, player_id, rnk, total, status)
      select p_id, c.player_id, c.crnk, c.total, 'won' from public._window_candidates(p_id, w.ends_at) c where c.crnk = rk.crnk;
      remaining := remaining - rk.g::int;
    else
      -- Everyone tied on all five keys and there are fewer medals than tied players: SHARED RANK, coin toss at the desk.
      insert into public.window_results (window_id, player_id, rnk, total, status)
      select p_id, c.player_id, c.crnk, c.total, 'toss' from public._window_candidates(p_id, w.ends_at) c where c.crnk = rk.crnk;
      update public.medal_windows set toss_slots = remaining where id = p_id;
      remaining := 0;
    end if;
  end loop;
  update public.medal_windows set closed_at = now() where id = p_id;
  perform public._cache_bust();
end $$;

-- Closes every ended window in order. Stops at a window whose predecessor still has an unresolved coin toss.
create or replace function public._close_due_windows()
returns void language plpgsql security definer set search_path = public as $$
declare w record;
begin
  if not exists (select 1 from public.medal_windows where closed_at is null and ends_at <= now()) then return; end if;
  if not pg_try_advisory_xact_lock(7001) then return; end if;
  for w in select id from public.medal_windows where closed_at is null and ends_at <= now() order by ends_at, id loop
    exit when exists (select 1 from public.window_results where status = 'toss');
    perform public._close_one_window(w.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Public view: the live window (leader + countdown), upcoming, and winners per closed window. Masked codenames only.
create or replace function public.public_windows()
returns jsonb language plpgsql security definer set search_path = public as $$
declare live public.medal_windows; leader jsonb := null; nxt public.medal_windows;
begin
  perform public._close_due_windows();
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

-- ---------------------------------------------------------------------------------------------
-- Desk side
create or replace function public.desk_windows()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_desk();
  perform public._close_due_windows();
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

create or replace function public.desk_window_save(p_id bigint, p_label text, p_starts timestamptz, p_ends timestamptz, p_medals int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.medal_windows;
begin
  perform public._require_desk();
  if p_ends is null or p_starts is null or p_ends <= p_starts or p_medals is null or p_medals < 0
     or length(btrim(coalesce(p_label, ''))) = 0 then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;
  if p_id is null then
    insert into public.medal_windows (label, starts_at, ends_at, medals_count) values (btrim(p_label), p_starts, p_ends, p_medals) returning * into w;
  else
    select * into w from public.medal_windows where id = p_id for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
    if w.closed_at is not null then return jsonb_build_object('ok', false, 'error', 'WINDOW_CLOSED'); end if;
    update public.medal_windows set label = btrim(p_label), starts_at = p_starts, ends_at = p_ends, medals_count = p_medals where id = p_id;
  end if;
  perform public._audit('window_save', w.id::text, jsonb_build_object('label', p_label, 'medals', p_medals));
  return jsonb_build_object('ok', true, 'id', w.id);
end $$;

create or replace function public.desk_window_delete(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_desk();
  if exists (select 1 from public.medal_windows where id = p_id and closed_at is not null) then
    return jsonb_build_object('ok', false, 'error', 'WINDOW_CLOSED');
  end if;
  delete from public.medal_windows where id = p_id;
  perform public._audit('window_delete', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- CLOSE: desk presses it once a window has ended (otherwise the first public/desk read after the end does it).
create or replace function public.desk_close_window(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w public.medal_windows;
begin
  perform public._require_desk();
  select * into w from public.medal_windows where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  if w.ends_at > now() then return jsonb_build_object('ok', false, 'error', 'NOT_ENDED'); end if;
  perform public._close_due_windows();
  select * into w from public.medal_windows where id = p_id;
  if w.closed_at is null then return jsonb_build_object('ok', false, 'error', 'RESOLVE_TOSS_FIRST'); end if;
  perform public._audit('window_close', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

-- Live coin toss: the desk picks exactly toss_slots players among the tied rows.
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
  perform public._close_due_windows();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.desk_medals_unclaimed()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_desk();
  perform public._close_due_windows();
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

create or replace function public.desk_claim_window_medal(p_result bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public._require_desk();
  update public.window_results set claimed_at = now(), claimed_by = auth.uid() where id = p_result and status = 'won' and claimed_at is null;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'NOT_CLAIMABLE'); end if;
  perform public._audit('claim_window_medal', p_result::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.desk_claim_match_medal(p_player text, p_station text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public._require_desk();
  update public.match_medals set claimed_at = now(), claimed_by = auth.uid() where player_id = p_player and station_id = p_station and claimed_at is null;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'NOT_CLAIMABLE'); end if;
  perform public._audit('claim_match_medal', p_player || ':' || p_station);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._window_candidates(bigint, timestamptz), public._close_one_window(bigint), public._close_due_windows() from public, anon, authenticated;
revoke all on function public.public_windows(), public.desk_windows(), public.desk_window_save(bigint, text, timestamptz, timestamptz, int),
  public.desk_window_delete(bigint), public.desk_close_window(bigint), public.desk_resolve_toss(bigint, text[]),
  public.desk_medals_unclaimed(), public.desk_claim_window_medal(bigint), public.desk_claim_match_medal(text, text) from public, anon, authenticated;
grant execute on function public.public_windows() to anon, authenticated;
grant execute on function public.desk_windows(), public.desk_window_save(bigint, text, timestamptz, timestamptz, int),
  public.desk_window_delete(bigint), public.desk_close_window(bigint), public.desk_resolve_toss(bigint, text[]),
  public.desk_medals_unclaimed(), public.desk_claim_window_medal(bigint), public.desk_claim_match_medal(text, text) to authenticated;
