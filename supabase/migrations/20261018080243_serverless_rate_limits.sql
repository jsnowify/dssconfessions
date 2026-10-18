-- Apply only to the restored dssconfessions project. Existing confession data is untouched.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to service_role;

create table app_private.api_rate_limits (
  key text primary key check (length(key) = 64),
  hits integer not null check (hits > 0),
  expires_at timestamptz not null
);
alter table app_private.api_rate_limits enable row level security;
revoke all on app_private.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on app_private.api_rate_limits to service_role;
create index api_rate_limits_expiry_idx on app_private.api_rate_limits (expires_at);

-- SECURITY INVOKER: only service_role can access the private counters. No RLS bypass helper.
create function public.consume_api_rate_limit(p_key text, p_window_seconds integer, p_limit integer)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_time_utc timestamptz := clock_timestamp();
  counter app_private.api_rate_limits%rowtype;
begin
  if length(p_key) <> 64 or p_window_seconds not between 1 and 86400 or p_limit not between 1 and 1000 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  -- One atomic upsert serializes requests for this IP hash across every function instance.
  insert into app_private.api_rate_limits as existing (key, hits, expires_at)
  values (p_key, 1, current_time_utc + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    hits = case when existing.expires_at <= current_time_utc then 1 else least(existing.hits + 1, p_limit + 1) end,
    expires_at = case when existing.expires_at <= current_time_utc
      then current_time_utc + make_interval(secs => p_window_seconds) else existing.expires_at end
  returning * into counter;

  -- Bound cleanup work. No cron service is needed; no raw IP addresses are stored.
  delete from app_private.api_rate_limits where key in (
    select key from app_private.api_rate_limits
    where expires_at < current_time_utc - interval '1 day'
    order by expires_at limit 100 for update skip locked
  );
  return jsonb_build_object(
    'allowed', counter.hits <= p_limit,
    'remaining', greatest(0, p_limit - counter.hits),
    'retry_after', greatest(1, ceil(extract(epoch from counter.expires_at - current_time_utc))::integer)
  );
end;
$$;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
