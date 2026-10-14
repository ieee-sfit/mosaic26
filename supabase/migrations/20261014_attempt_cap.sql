-- Max 4 attempts per player per station. Enforced when IDs are checked (check_players_for) and again on submit_run.
-- The original 3-argument check_players stays for older builds.
create or replace function public.check_players_for(p_secret text, p1 text, p2 text, p_station text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a record; b record; sa text; sb text; ra int := 0; rb int := 0; cap constant int := 4;
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
  if p_station is not null then
    select count(*) into ra from public.station_runs where station_id = p_station and (p1_id = p1 or p2_id = p1);
    select count(*) into rb from public.station_runs where station_id = p_station and (p1_id = p2 or p2_id = p2);
    if sa = 'OK' and ra >= cap then sa := 'LIMIT'; end if;
    if sb = 'OK' and rb >= cap then sb := 'LIMIT'; end if;
  end if;
  return jsonb_build_object(
    'ok', sa = 'OK' and sb = 'OK',
    'cap', cap,
    'p1', jsonb_build_object('status', sa, 'name', split_part(coalesce(a.name, ''), ' ', 1), 'runs', ra),
    'p2', jsonb_build_object('status', sb, 'name', split_part(coalesce(b.name, ''), ' ', 1), 'runs', rb)
  );
end $$;

revoke all on function public.check_players_for(text, text, text, text) from public;
grant execute on function public.check_players_for(text, text, text, text) to anon, authenticated;

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
