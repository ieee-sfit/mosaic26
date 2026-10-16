-- Any 6-digit ID may play: no registration / payment check. Unknown IDs are created on the fly (paid = true, name 'Player'),
-- and IDs already in the table are treated as paid. The 4-attempts-per-station cap and the score sanity checks stay.
create or replace function public._ensure_player(p_id text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_id ~ '^[0-9]{6}$' then
    insert into public.players (id, name, paid) values (p_id, 'Player', true)
    on conflict (id) do update set paid = true where public.players.paid = false;
  end if;
end $$;
revoke all on function public._ensure_player(text) from public, anon, authenticated;

create or replace function public.check_players_for(p_secret text, p1 text, p2 text, p_station text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record; b record; sa text := 'OK'; sb text := 'OK'; ra int := 0; rb int := 0; cap constant int := 4;
begin
  if not public._kiosk_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED_KIOSK');
  end if;
  if p1 = p2 then
    return jsonb_build_object('ok', false, 'error', 'SAME_ID');
  end if;
  perform public._ensure_player(p1); perform public._ensure_player(p2);
  select * into a from public.players where id = p1;
  select * into b from public.players where id = p2;
  if p_station is not null then
    select count(*) into ra from public.station_runs where station_id = p_station and (p1_id = p1 or p2_id = p1);
    select count(*) into rb from public.station_runs where station_id = p_station and (p1_id = p2 or p2_id = p2);
    if ra >= cap then sa := 'LIMIT'; end if;
    if rb >= cap then sb := 'LIMIT'; end if;
  end if;
  return jsonb_build_object(
    'ok', sa = 'OK' and sb = 'OK', 'cap', cap,
    'p1', jsonb_build_object('status', sa, 'name', split_part(coalesce(a.name, ''), ' ', 1), 'runs', ra),
    'p2', jsonb_build_object('status', sb, 'name', split_part(coalesce(b.name, ''), ' ', 1), 'runs', rb)
  );
end $$;

create or replace function public.check_players(p_secret text, p1 text, p2 text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public.check_players_for(p_secret, p1, p2, null);
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
  if p1 = p2 or p_raw is null or p_raw < 0 or p_raw > 140
     or p_time_left is null or p_time_left < 0 or p_time_left > 720 or p1 !~ '^[0-9]{6}$' or p2 !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'error', 'BAD_PAYLOAD');
  end if;
  if exists (select 1 from public.station_runs where client_run_id = p_client_run_id) then
    return jsonb_build_object('ok', true);
  end if;
  perform public._ensure_player(p1); perform public._ensure_player(p2);
  if (select count(*) from public.station_runs where station_id = p_station and (p1_id = p1 or p2_id = p1)) >= 4
     or (select count(*) from public.station_runs where station_id = p_station and (p1_id = p2 or p2_id = p2)) >= 4 then
    return jsonb_build_object('ok', false, 'error', 'ATTEMPT_LIMIT');
  end if;
  insert into public.station_runs (p1_id, p2_id, station_id, raw_score, time_left, client_run_id)
  values (p1, p2, p_station, p_raw, p_time_left, p_client_run_id)
  on conflict (client_run_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.check_players(text, text, text), public.check_players_for(text, text, text, text),
  public.submit_run(text, uuid, text, text, text, int, int) from public;
grant execute on function public.check_players(text, text, text), public.check_players_for(text, text, text, text),
  public.submit_run(text, uuid, text, text, text, int, int) to anon, authenticated;
