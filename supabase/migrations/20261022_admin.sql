-- MOSAIC 26 rebuild, part 7: admin role (full access) on top of the committee desk.
-- Admins can do everything a desk user can, plus: manage team accounts (rename, enable/disable, reset password),
-- edit event settings (price, attempt cap, medal threshold, lobby timing) and read the audit log.
-- NOT applied automatically.

create or replace function public._require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.committee_members where user_id = auth.uid() and active and role = 'admin') then
    raise exception 'NOT_ADMIN' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_members()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', user_id, 'username', username, 'display_name', display_name,
                                                        'role', role, 'active', active) order by role desc, username)
                   from public.committee_members), '[]'::jsonb);
end $$;

create or replace function public.admin_member_update(p_user uuid, p_display_name text, p_active boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if length(btrim(coalesce(p_display_name, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'NAME_REQUIRED'); end if;
  if p_user = auth.uid() and not coalesce(p_active, true) then return jsonb_build_object('ok', false, 'error', 'CANNOT_DISABLE_SELF'); end if;
  update public.committee_members set display_name = btrim(p_display_name), active = coalesce(p_active, active) where user_id = p_user;
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  perform public._audit('member_update', p_user::text, jsonb_build_object('display_name', btrim(p_display_name), 'active', p_active));
  return jsonb_build_object('ok', true);
end $$;

-- Reset another member's password (e.g. a volunteer forgot it). The password is never written to the audit log.
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public._require_admin();
  if length(coalesce(p_password, '')) < 8 then return jsonb_build_object('ok', false, 'error', 'WEAK_PASSWORD'); end if;
  if not exists (select 1 from public.committee_members where user_id = p_user) then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  perform public._audit('admin_set_password', p_user::text);
  return jsonb_build_object('ok', true);
end $$;

-- Event settings. Only the keys below can be edited; every value is range-checked.
create or replace function public.admin_config()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return coalesce((select jsonb_object_agg(key, value) from public.app_config
                   where key in ('price_inr', 'attempt_cap', 'match_medal_min_raw', 'lobby_ttl_minutes', 'lobby_countdown_secs', 'lobby_min_players', 'lobby_max_players')), '{}'::jsonb);
end $$;

create or replace function public.admin_config_set(p_key text, p_value int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare lo int; hi int;
begin
  perform public._require_admin();
  select l, h into lo, hi from (values
    ('price_inr', 1, 5000), ('attempt_cap', 1, 100), ('match_medal_min_raw', 0, 140), ('lobby_ttl_minutes', 1, 120),
    ('lobby_countdown_secs', 3, 30), ('lobby_min_players', 2, 5), ('lobby_max_players', 2, 5)) t(k, l, h) where k = p_key;
  if lo is null then return jsonb_build_object('ok', false, 'error', 'UNKNOWN_KEY'); end if;
  if p_value is null or p_value < lo or p_value > hi then return jsonb_build_object('ok', false, 'error', 'OUT_OF_RANGE', 'min', lo, 'max', hi); end if;
  update public.app_config set value = to_jsonb(p_value), updated_at = now() where key = p_key;
  perform public._audit('config_set', p_key, jsonb_build_object('value', p_value));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_audit(p_limit int default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return coalesce((select jsonb_agg(x) from (
    select a.at, coalesce(m.display_name, '(system)') as who, a.action, a.subject, a.detail
    from public.audit_log a left join public.committee_members m on m.user_id = a.actor
    order by a.id desc limit greatest(least(coalesce(p_limit, 100), 500), 1)) x), '[]'::jsonb);
end $$;

revoke all on function public._require_admin() from public, anon, authenticated;
revoke all on function public.admin_members(), public.admin_member_update(uuid, text, boolean), public.admin_set_password(uuid, text),
  public.admin_config(), public.admin_config_set(text, int), public.admin_audit(int) from public, anon, authenticated;
grant execute on function public.admin_members(), public.admin_member_update(uuid, text, boolean), public.admin_set_password(uuid, text),
  public.admin_config(), public.admin_config_set(text, int), public.admin_audit(int) to authenticated;
