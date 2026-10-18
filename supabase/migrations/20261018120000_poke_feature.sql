-- Migration: 20261018120000_poke_feature.sql
-- DSSConfessions: Anonymous Poke Interaction
-- Idempotent, safe to rerun, zero client IP storage, service-role only.
begin;

-- 1. Add poke_count column to confessions if not exists
alter table public.confessions add column if not exists poke_count integer not null default 0;

-- 2. Guarded check constraint for non-negative count
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'confessions_poke_count_check'
  ) then
    alter table public.confessions add constraint confessions_poke_count_check check (poke_count >= 0);
  end if;
end $$;

-- 3. Create poke_log table for daily per-client deduplication
create table if not exists public.poke_log (
  confession_id uuid not null references public.confessions(id) on delete cascade,
  poker_hash text not null,
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  constraint poke_log_pkey primary key (confession_id, poker_hash, day)
);

-- Index for cleanup queries
create index if not exists idx_poke_log_day on public.poke_log(day);

-- RLS: Enabled with NO public policies (service-role only)
alter table public.poke_log enable row level security;
revoke all on public.poke_log from public, anon, authenticated;
grant select, insert, update, delete on public.poke_log to service_role;

-- 4. Atomic RPC to poke a confession safely
create or replace function public.poke_confession(
  p_confession_id uuid,
  p_poker_hash text
)
returns table(count integer, already_poked boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted boolean := false;
  v_count integer;
  v_exists boolean;
begin
  if p_confession_id is null or p_poker_hash is null or length(p_poker_hash) < 32 then
    raise exception 'Invalid poke parameters' using errcode = '22P02';
  end if;

  -- Ensure confession exists and is not hidden
  select exists (
    select 1 from public.confessions
    where id = p_confession_id and coalesce(is_hidden, false) = false
  ) into v_exists;

  if not v_exists then
    raise exception 'Confession not found' using errcode = 'P0002';
  end if;

  -- Attempt insert into poke_log for today (UTC)
  insert into public.poke_log (confession_id, poker_hash, day)
  values (p_confession_id, p_poker_hash, (now() at time zone 'utc')::date)
  on conflict (confession_id, poker_hash, day) do nothing;

  if found then
    update public.confessions
    set poke_count = coalesce(poke_count, 0) + 1
    where id = p_confession_id
    returning poke_count into v_count;

    return query select v_count, false;
  else
    select coalesce(poke_count, 0) into v_count
    from public.confessions
    where id = p_confession_id;

    return query select v_count, true;
  end if;
end;
$$;

revoke all on function public.poke_confession(uuid, text) from public, anon, authenticated;
grant execute on function public.poke_confession(uuid, text) to service_role;

-- 5. Cleanup RPC to purge old poke logs (> 2 days)
create or replace function public.purge_old_pokes(p_days integer default 2)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_days is null or p_days < 1 then
    raise exception 'Invalid retention days' using errcode = 'P0001';
  end if;

  delete from public.poke_log
  where day < ((now() at time zone 'utc')::date - (p_days || ' days')::interval);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_pokes(integer) from public, anon, authenticated;
grant execute on function public.purge_old_pokes(integer) to service_role;

notify pgrst, 'reload schema';
commit;
