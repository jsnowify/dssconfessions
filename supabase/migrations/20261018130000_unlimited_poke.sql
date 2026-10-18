-- Migration: Unlimited and Counted Poke
-- Timestamp: 20261018130000_unlimited_poke.sql
-- Idempotent, non-destructive migration. Keeps all existing counts.
-- poke_log is deprecated and retained (not dropped).

-- 1. Alter confessions.poke_count to bigint (safe to run repeatedly)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'confessions'
      and column_name = 'poke_count'
  ) then
    alter table public.confessions alter column poke_count type bigint;
    alter table public.confessions alter column poke_count set default 0;
    alter table public.confessions alter column poke_count set not null;
  else
    alter table public.confessions add column poke_count bigint not null default 0;
  end if;
end;
$$;

-- 2. Drop the old poke_confession(uuid, text) signature so PostgREST has no ambiguous overloads
drop function if exists public.poke_confession(uuid, text);

-- 3. Drop the old purge_old_pokes(integer) signature as poke_log is no longer actively written
drop function if exists public.purge_old_pokes(integer);

-- 4. Create the new poke_confession(p_confession_id uuid, p_amount int) RPC
-- Validates amount between 1 and 100, increments atomically in a single statement,
-- and returns the new bigint count.
create or replace function public.poke_confession(
  p_confession_id uuid,
  p_amount int default 1
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_count bigint;
begin
  if p_amount is null or p_amount < 1 or p_amount > 100 then
    raise exception 'Poke amount must be between 1 and 100';
  end if;

  update public.confessions
  set poke_count = poke_count + p_amount
  where id = p_confession_id
    and is_hidden = false
  returning poke_count into v_new_count;

  return v_new_count;
end;
$$;

-- 5. Set function permissions (service_role only, matching project standards)
revoke all on function public.poke_confession(uuid, int) from public, anon, authenticated;
grant execute on function public.poke_confession(uuid, int) to service_role;

-- 6. Reload PostgREST schema cache
notify pgrst, 'reload schema';

