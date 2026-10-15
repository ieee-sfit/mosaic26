-- MOSAIC 26 rebuild, part 6: failed-login throttle for committee accounts.
-- Wired through Supabase Auth's "Password verification attempt" hook (Dashboard > Authentication > Hooks):
-- point it at public.hook_password_verification_attempt. Without that switch the function exists but is never called.
-- NOTE: Supabase documents this hook as available on the Teams and Enterprise plans only. On Free/Pro use the Auth rate limits instead.
-- NOT applied automatically.

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_user_idx on public.login_attempts (user_id, at);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

-- 5 wrong passwords inside 15 minutes lock the account for the rest of that window. A correct login resets the count
-- (rows are never deleted: only failures newer than the last success are counted).
create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := (event ->> 'user_id')::uuid; recent int; ok boolean := coalesce((event ->> 'valid')::boolean, false); last_ok timestamptz;
begin
  select max(at) into last_ok from public.login_attempts where user_id = uid and login_attempts.ok;
  select count(*) into recent from public.login_attempts
   where user_id = uid and not login_attempts.ok and at > now() - interval '15 minutes' and at > coalesce(last_ok, '-infinity');
  if recent >= 5 then
    return jsonb_build_object('decision', 'reject', 'message', 'Too many failed attempts. Try again in 15 minutes.');
  end if;
  insert into public.login_attempts (user_id, ok) values (uid, ok);
  return jsonb_build_object('decision', 'continue');
end $$;

revoke all on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
    grant insert, select on public.login_attempts to supabase_auth_admin;
  end if;
end $$;
