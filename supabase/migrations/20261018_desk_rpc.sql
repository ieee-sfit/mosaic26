-- MOSAIC 26 rebuild, part 3: desk (committee) RPCs. Every function is security definer and starts with _require_desk().
-- NOT applied automatically.

create or replace function public.desk_me()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m public.committee_members;
begin
  perform public._require_desk();
  select * into m from public.committee_members where user_id = auth.uid();
  return jsonb_build_object('ok', true, 'username', m.username, 'display_name', m.display_name, 'role', m.role,
    'first_name', split_part(btrim(m.display_name), ' ', 1),
    'price_inr', public._cfg_int('price_inr'), 'attempt_cap', public._cfg_int('attempt_cap'),
    'desk_hours', (select value from public.app_config where key = 'desk_hours'));
end $$;

create or replace function public._me_first_name()
returns text language sql stable security definer set search_path = public as $$
  select split_part(btrim(display_name), ' ', 1) from public.committee_members where user_id = auth.uid();
$$;

-- Total rupees received from this player (all top-ups), so the desk can see at a glance that they have paid.
create or replace function public._paid_inr(p_id text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount_inr), 0)::int from public.credit_ledger where player_id = p_id and delta > 0;
$$;

create or replace function public._credits_for(p_amount int)
returns int language plpgsql stable security definer set search_path = public as $$
declare price int := public._cfg_int('price_inr');
begin
  if p_amount is null or p_amount < price or p_amount % price <> 0 then return null; end if;
  return p_amount / price;
end $$;

create or replace function public.desk_register(
  p_name text, p_college text, p_is_internal boolean, p_pid text, p_year text, p_department text, p_phone text,
  p_amount_inr int, p_mode text, p_payment_ref text, p_received_by text, p_notes text, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_phone text := public._norm_phone(p_phone); v_pid text := nullif(btrim(coalesce(p_pid, '')), '');
  credits int; ex record; new_id text; tries int := 0; n int; code text; recv text;
begin
  perform public._require_desk();
  if p_request_id is not null then
    select l.player_id into new_id from public.credit_ledger l where l.request_id = p_request_id;
    if found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'id', new_id, 'balance', public._balance(new_id),
        'codename', (select codename from public.players where id = new_id));
    end if;
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'NAME_REQUIRED'); end if;
  if length(btrim(coalesce(p_college, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'COLLEGE_REQUIRED'); end if;
  if length(btrim(coalesce(p_year, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'YEAR_REQUIRED'); end if;
  if length(btrim(coalesce(p_department, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'DEPARTMENT_REQUIRED'); end if;
  if v_phone !~ '^[0-9]{10}$' then return jsonb_build_object('ok', false, 'error', 'BAD_PHONE'); end if;
  if p_mode is null or p_mode not in ('cash', 'upi', 'online') then return jsonb_build_object('ok', false, 'error', 'BAD_MODE'); end if;
  credits := public._credits_for(p_amount_inr);
  if credits is null then return jsonb_build_object('ok', false, 'error', 'BAD_AMOUNT', 'price_inr', public._cfg_int('price_inr')); end if;
  recv := coalesce(nullif(btrim(p_received_by), ''), public._me_first_name());

  loop
    select id, name into ex from public.players where players.phone = v_phone;
    if found then return jsonb_build_object('ok', false, 'error', 'DUPLICATE_PHONE', 'existing_id', ex.id, 'existing_name', ex.name); end if;
    if v_pid is not null then
      select id, name into ex from public.players where lower(players.pid) = lower(v_pid);
      if found then return jsonb_build_object('ok', false, 'error', 'DUPLICATE_PID', 'existing_id', ex.id, 'existing_name', ex.name); end if;
    end if;
    tries := tries + 1;
    if tries > 300 then raise exception 'ID_SPACE_EXHAUSTED'; end if;
    new_id := lpad(floor(random() * 10000)::int::text, 4, '0');
    code := public._new_codename();
    insert into public.players (id, name, college, is_internal, pid, year, department, phone, notes, codename, registered_by)
    values (new_id, btrim(p_name), btrim(p_college), coalesce(p_is_internal, false), v_pid, btrim(p_year), btrim(p_department),
            v_phone, nullif(btrim(coalesce(p_notes, '')), ''), code, auth.uid())
    on conflict do nothing;
    get diagnostics n = row_count;
    exit when n = 1;      -- else an ID/codename collision or a concurrent duplicate: loop re-checks phone/PID, then retries
  end loop;

  insert into public.credit_ledger (player_id, delta, amount_inr, mode, payment_ref, received_by_name, desk_user, reason, request_id)
  values (new_id, credits, p_amount_inr, p_mode, nullif(btrim(coalesce(p_payment_ref, '')), ''), recv, auth.uid(), 'registration_topup', p_request_id);
  perform public._audit('register', new_id, jsonb_build_object('credits', credits, 'amount_inr', p_amount_inr, 'mode', p_mode));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', new_id, 'name', btrim(p_name), 'codename', code,
    'balance', credits, 'credits_added', credits);
end $$;

create or replace function public.desk_topup(
  p_id text, p_amount_inr int, p_mode text, p_payment_ref text, p_received_by text, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare credits int; pl public.players; recv text;
begin
  perform public._require_desk();
  if p_request_id is not null and exists (select 1 from public.credit_ledger where request_id = p_request_id) then
    return jsonb_build_object('ok', true, 'duplicate', true, 'id', p_id, 'balance', public._balance(p_id));
  end if;
  select * into pl from public.players where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_REGISTERED'); end if;
  if p_mode is null or p_mode not in ('cash', 'upi', 'online') then return jsonb_build_object('ok', false, 'error', 'BAD_MODE'); end if;
  credits := public._credits_for(p_amount_inr);
  if credits is null then return jsonb_build_object('ok', false, 'error', 'BAD_AMOUNT', 'price_inr', public._cfg_int('price_inr')); end if;
  recv := coalesce(nullif(btrim(p_received_by), ''), public._me_first_name());
  insert into public.credit_ledger (player_id, delta, amount_inr, mode, payment_ref, received_by_name, desk_user, reason, request_id)
  values (p_id, credits, p_amount_inr, p_mode, nullif(btrim(coalesce(p_payment_ref, '')), ''), recv, auth.uid(), 'topup', p_request_id);
  perform public._audit('topup', p_id, jsonb_build_object('credits', credits, 'amount_inr', p_amount_inr, 'mode', p_mode));
  return jsonb_build_object('ok', true, 'duplicate', false, 'id', p_id, 'name', pl.name, 'credits_added', credits, 'balance', public._balance(p_id));
end $$;

create or replace function public.desk_find(p_q text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := btrim(coalesce(p_q, '')); d text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
begin
  perform public._require_desk();
  if length(q) < 2 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'college', p.college, 'phone', p.phone, 'pid', p.pid,
                                        'codename', p.codename, 'balance', public._balance(p.id), 'year', p.year, 'department', p.department,
                                        'is_internal', p.is_internal, 'paid_inr', public._paid_inr(p.id)) order by p.name)
    from (
      select * from public.players
      where (d <> '' and length(d) = 4 and id = d)
         or (length(d) >= 4 and phone like '%' || d || '%')
         or (pid is not null and lower(pid) = lower(q))
         or lower(name) like '%' || lower(q) || '%'
      order by name limit 25) p), '[]'::jsonb);
end $$;

create or replace function public.desk_player(p_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare pl public.players; st record;
begin
  perform public._require_desk();
  select * into pl from public.players where id = p_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_REGISTERED'); end if;
  select * into st from public._ranked() where player_id = p_id;
  return jsonb_build_object('ok', true,
    'player', jsonb_build_object('id', pl.id, 'name', pl.name, 'college', pl.college, 'is_internal', pl.is_internal, 'pid', pl.pid,
      'year', pl.year, 'department', pl.department, 'phone', pl.phone, 'notes', pl.notes, 'codename', pl.codename, 'created_at', pl.created_at),
    'balance', public._balance(p_id), 'paid_inr', public._paid_inr(p_id),
    'standing', case when st.player_id is null then null else jsonb_build_object('rank', st.rnk, 'shared', st.shared, 'total', st.total) end,
    'runs', coalesce((select jsonb_agg(jsonb_build_object('run_id', r.client_run_id, 'station', r.station_id, 'state', r.state,
        'raw', r.raw_score, 'time_left', r.time_left, 'hints', r.hints_used, 'wrong', r.wrong_attempts, 'lobby_id', r.lobby_id,
        'started_at', r.started_at, 'finished_at', r.finished_at, 'reason', r.void_reason) order by r.started_at desc)
      from public.station_runs r where r.player_id = p_id), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(jsonb_build_object('delta', l.delta, 'amount_inr', l.amount_inr, 'mode', l.mode,
        'payment_ref', l.payment_ref, 'received_by', l.received_by_name, 'reason', l.reason, 'at', l.created_at) order by l.id desc)
      from public.credit_ledger l where l.player_id = p_id), '[]'::jsonb));
end $$;

-- Refund: credit back, run excluded from the cap and the boards. Void: excluded, no credit back. Both need a reason; both audited.
create or replace function public._close_run(p_run uuid, p_reason text, p_refund boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.station_runs;
begin
  perform public._require_desk();
  if length(btrim(coalesce(p_reason, ''))) < 3 then return jsonb_build_object('ok', false, 'error', 'REASON_REQUIRED'); end if;
  select * into r from public.station_runs where client_run_id = p_run;
  if not found then return jsonb_build_object('ok', false, 'error', 'RUN_NOT_FOUND'); end if;
  perform 1 from public.players where id = r.player_id for update;
  select * into r from public.station_runs where client_run_id = p_run for update;
  if r.state not in ('started', 'completed') then return jsonb_build_object('ok', false, 'error', 'ALREADY_CLOSED', 'state', r.state); end if;
  update public.station_runs set state = case when p_refund then 'refunded' else 'voided' end, voided_at = now(), void_reason = btrim(p_reason)
   where id = r.id;
  if p_refund then
    insert into public.credit_ledger (player_id, delta, desk_user, reason, run_id) values (r.player_id, 1, auth.uid(), 'refund', r.client_run_id);
  end if;
  perform public._cache_bust();
  perform public._audit(case when p_refund then 'refund_run' else 'void_run' end, r.client_run_id::text,
    jsonb_build_object('player', r.player_id, 'station', r.station_id, 'reason', btrim(p_reason), 'prev_state', r.state));
  return jsonb_build_object('ok', true, 'balance', public._balance(r.player_id), 'player_id', r.player_id);
end $$;

create or replace function public.desk_refund_run(p_run uuid, p_reason text)
returns jsonb language sql security definer set search_path = public as $$ select public._close_run(p_run, p_reason, true); $$;
create or replace function public.desk_void_run(p_run uuid, p_reason text)
returns jsonb language sql security definer set search_path = public as $$ select public._close_run(p_run, p_reason, false); $$;

create or replace function public.desk_college_suggest(p_q text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_desk();
  return coalesce((
    select jsonb_agg(college) from (
      select college from public.players
      where length(btrim(coalesce(p_q, ''))) >= 1 and lower(college) like '%' || lower(btrim(p_q)) || '%'
      group by college order by count(*) desc, college limit 8) s), '[]'::jsonb);
end $$;

-- Cash report per volunteer (desk user). Range defaults to everything.
create or replace function public.desk_cash_report(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb; ev jsonb;
begin
  perform public._require_desk();
  select coalesce(jsonb_agg(x order by x ->> 'display_name'), '[]'::jsonb) into v from (
    select jsonb_build_object(
      'user', coalesce(m.username, '(unknown)'), 'display_name', coalesce(m.display_name, '(unknown)'),
      'cash', coalesce(sum(l.amount_inr) filter (where l.mode = 'cash'), 0),
      'upi', coalesce(sum(l.amount_inr) filter (where l.mode = 'upi'), 0),
      'online', coalesce(sum(l.amount_inr) filter (where l.mode = 'online'), 0),
      'total_inr', coalesce(sum(l.amount_inr), 0),
      'credits_issued', coalesce(sum(l.delta), 0),
      'registrations', count(*) filter (where l.reason = 'registration_topup'),
      'topups', count(*) filter (where l.reason = 'topup')) as x
    from public.credit_ledger l left join public.committee_members m on m.user_id = l.desk_user
    where l.delta > 0 and l.reason in ('registration_topup', 'topup')
      and (p_from is null or l.created_at >= p_from) and (p_to is null or l.created_at < p_to)
    group by m.username, m.display_name) s;
  select jsonb_build_object(
    'runs_started', (select count(*) from public.station_runs where (p_from is null or started_at >= p_from) and (p_to is null or started_at < p_to)),
    'credits_spent', (select coalesce(-sum(delta), 0) from public.credit_ledger where reason = 'run_start' and (p_from is null or created_at >= p_from) and (p_to is null or created_at < p_to)),
    'credits_refunded', (select coalesce(sum(delta), 0) from public.credit_ledger where reason = 'refund' and (p_from is null or created_at >= p_from) and (p_to is null or created_at < p_to)),
    'outstanding_credits', (select coalesce(sum(delta), 0) from public.credit_ledger)) into ev;
  return jsonb_build_object('ok', true, 'volunteers', v, 'event', ev);
end $$;

revoke all on function public._me_first_name(), public._paid_inr(text), public._credits_for(int), public._close_run(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.desk_me(), public.desk_register(text, text, boolean, text, text, text, text, int, text, text, text, text, uuid),
  public.desk_topup(text, int, text, text, text, uuid), public.desk_find(text), public.desk_player(text),
  public.desk_refund_run(uuid, text), public.desk_void_run(uuid, text), public.desk_college_suggest(text),
  public.desk_cash_report(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.desk_me(), public.desk_register(text, text, boolean, text, text, text, text, int, text, text, text, text, uuid),
  public.desk_topup(text, int, text, text, text, uuid), public.desk_find(text), public.desk_player(text),
  public.desk_refund_run(uuid, text), public.desk_void_run(uuid, text), public.desk_college_suggest(text),
  public.desk_cash_report(timestamptz, timestamptz) to authenticated;

-- Any committee member can change their own password (the first passwords were shared in a chat, so rotating them is wise).
create or replace function public.desk_change_password(p_old text, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare cur text;
begin
  perform public._require_desk();
  if length(coalesce(p_new, '')) < 8 then return jsonb_build_object('ok', false, 'error', 'WEAK_PASSWORD'); end if;
  select encrypted_password into cur from auth.users where id = auth.uid();
  if cur is null or cur <> crypt(coalesce(p_old, ''), cur) then return jsonb_build_object('ok', false, 'error', 'WRONG_PASSWORD'); end if;
  update auth.users set encrypted_password = crypt(p_new, gen_salt('bf')), updated_at = now() where id = auth.uid();
  perform public._audit('change_password', auth.uid()::text);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.desk_change_password(text, text) from public, anon, authenticated;
grant execute on function public.desk_change_password(text, text) to authenticated;
