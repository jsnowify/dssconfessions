-- One-file repair for legacy, partially applied, or current DSSConfessions schemas.
-- Run as the project administrator in Supabase SQL Editor. Re-runnable.
-- No rows, tables, columns, existing keys, moderation flags or counters are removed.
begin;
create schema if not exists app_private;
create schema if not exists extensions;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to service_role;
grant usage on schema public to service_role;

create table if not exists public.confessions (
  id uuid default gen_random_uuid(),
  created_at timestamptz default now(),
  recipient_to text,
  sender_from text default 'Anonymous',
  content text,
  song_name text,
  artist_name text,
  album_art text,
  spotify_url text,
  delete_key_hash text,
  allow_replies boolean default true,
  is_hidden boolean default false,
  needs_review boolean default false
);
alter table public.confessions add column if not exists id uuid default gen_random_uuid();
alter table public.confessions add column if not exists created_at timestamptz default now();
alter table public.confessions add column if not exists recipient_to text;
alter table public.confessions add column if not exists sender_from text default 'Anonymous';
alter table public.confessions add column if not exists content text;
alter table public.confessions add column if not exists song_name text;
alter table public.confessions add column if not exists artist_name text;
alter table public.confessions add column if not exists album_art text;
alter table public.confessions add column if not exists spotify_url text;
alter table public.confessions add column if not exists delete_key_hash text;
alter table public.confessions add column if not exists allow_replies boolean default true;
alter table public.confessions add column if not exists is_hidden boolean default false;
alter table public.confessions add column if not exists needs_review boolean default false;
alter table public.confessions add column if not exists poke_count bigint not null default 0;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'confessions_poke_count_check'
  ) then
    alter table public.confessions add constraint confessions_poke_count_check check (poke_count >= 0);
  end if;
end $$;
alter table public.confessions enable row level security;
revoke all on public.confessions from public, anon, authenticated;
grant select, insert, update, delete on public.confessions to service_role;

create table if not exists public.poke_log (
  confession_id uuid not null references public.confessions(id) on delete cascade,
  poker_hash text not null,
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  constraint poke_log_pkey primary key (confession_id, poker_hash, day)
);
create index if not exists idx_poke_log_day on public.poke_log(day);
alter table public.poke_log enable row level security;
revoke all on public.poke_log from public, anon, authenticated;
grant select, insert, update, delete on public.poke_log to service_role;

create table if not exists public.search_terms (
  term text,
  hits integer default 0,
  last_searched timestamptz
);
alter table public.search_terms add column if not exists term text;
alter table public.search_terms add column if not exists hits integer default 0;
alter table public.search_terms add column if not exists last_searched timestamptz;
alter table public.search_terms enable row level security;
revoke all on public.search_terms from public, anon, authenticated;
grant select, insert, update, delete on public.search_terms to service_role;

create table if not exists public.replies (
  id uuid default gen_random_uuid(),
  confession_id uuid,
  song_name text,
  artist_name text,
  album_art text,
  spotify_url text,
  spotify_track_id text,
  note text,
  is_hidden boolean default false,
  needs_review boolean default false,
  created_at timestamptz default now()
);
alter table public.replies add column if not exists id uuid default gen_random_uuid();
alter table public.replies add column if not exists confession_id uuid;
alter table public.replies add column if not exists song_name text;
alter table public.replies add column if not exists artist_name text;
alter table public.replies add column if not exists album_art text;
alter table public.replies add column if not exists spotify_url text;
alter table public.replies add column if not exists spotify_track_id text;
alter table public.replies add column if not exists note text;
alter table public.replies add column if not exists is_hidden boolean default false;
alter table public.replies add column if not exists needs_review boolean default false;
alter table public.replies add column if not exists created_at timestamptz default now();
alter table public.replies enable row level security;
revoke all on public.replies from public, anon, authenticated;
grant select, insert, update, delete on public.replies to service_role;

create table if not exists public.reports (
  id uuid default gen_random_uuid(),
  target_type text,
  target_id uuid,
  confession_id uuid,
  reply_id uuid,
  reason text,
  details text,
  reporter_hash text,
  created_at timestamptz default now()
);
alter table public.reports add column if not exists id uuid default gen_random_uuid();
alter table public.reports add column if not exists target_type text;
alter table public.reports add column if not exists target_id uuid;
alter table public.reports add column if not exists confession_id uuid;
alter table public.reports add column if not exists reply_id uuid;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists details text;
alter table public.reports add column if not exists reporter_hash text;
alter table public.reports add column if not exists created_at timestamptz default now();
alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
grant select, insert, update, delete on public.reports to service_role;

create table if not exists app_private.api_rate_limits (
  key text,
  hits integer,
  expires_at timestamptz
);
alter table app_private.api_rate_limits add column if not exists key text;
alter table app_private.api_rate_limits add column if not exists hits integer;
alter table app_private.api_rate_limits add column if not exists expires_at timestamptz;
alter table app_private.api_rate_limits enable row level security;
revoke all on app_private.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on app_private.api_rate_limits to service_role;

-- Restore safe defaults even if an earlier manual run created nullable flags.
-- Only previously unknown flag values are initialized; true/false values survive.
alter table public.confessions alter column is_hidden set default false;
update public.confessions set is_hidden=false where is_hidden is null;
alter table public.confessions alter column is_hidden set not null;
alter table public.confessions alter column needs_review set default false;
update public.confessions set needs_review=false where needs_review is null;
alter table public.confessions alter column needs_review set not null;
alter table public.confessions alter column allow_replies set default true;
update public.confessions set allow_replies=true where allow_replies is null;
alter table public.confessions alter column allow_replies set not null;
alter table public.replies alter column is_hidden set default false;
update public.replies set is_hidden=false where is_hidden is null;
alter table public.replies alter column is_hidden set not null;
alter table public.replies alter column needs_review set default false;
update public.replies set needs_review=false where needs_review is null;
alter table public.replies alter column needs_review set not null;
alter table public.confessions alter column id set default gen_random_uuid();
alter table public.confessions alter column created_at set default now();
alter table public.replies alter column id set default gen_random_uuid();
alter table public.replies alter column created_at set default now();
alter table public.reports alter column id set default gen_random_uuid();
alter table public.reports alter column created_at set default now();
alter table public.confessions alter column sender_from set default 'Anonymous';
alter table public.search_terms alter column hits set default 0;
update public.search_terms set hits=0 where hits is null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.confessions'::regclass and contype='p') then
    alter table public.confessions add constraint confessions_pkey primary key (id);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.search_terms'::regclass and contype='p') then
    alter table public.search_terms add constraint search_terms_pkey primary key (term);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.replies'::regclass and contype='p') then
    alter table public.replies add constraint replies_pkey primary key (id);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and contype='p') then
    alter table public.reports add constraint reports_pkey primary key (id);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='app_private.api_rate_limits'::regclass and contype='p') then
    alter table app_private.api_rate_limits add constraint api_rate_limits_pkey primary key (key);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.replies'::regclass and conname='replies_confession_id_fkey') then
    alter table public.replies add constraint replies_confession_id_fkey foreign key (confession_id) references public.confessions(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_confession_id_fkey') then
    alter table public.reports add constraint reports_confession_id_fkey foreign key (confession_id) references public.confessions(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_reply_id_fkey') then
    alter table public.reports add constraint reports_reply_id_fkey foreign key (reply_id) references public.replies(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_target_type_target_id_reporter_hash_key') then
    alter table public.reports add constraint reports_target_type_target_id_reporter_hash_key unique (target_type,target_id,reporter_hash);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.search_terms'::regclass and conname='search_terms_term_check') then
    alter table public.search_terms add constraint search_terms_term_check check (char_length(term) between 2 and 40);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.search_terms'::regclass and conname='search_terms_hits_check') then
    alter table public.search_terms add constraint search_terms_hits_check check (hits >= 0);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.replies'::regclass and conname='replies_spotify_track_id_check') then
    alter table public.replies add constraint replies_spotify_track_id_check check (spotify_track_id ~ '^[A-Za-z0-9]{22}$');
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.replies'::regclass and conname='replies_note_check') then
    alter table public.replies add constraint replies_note_check check (char_length(note) <= 140);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_target_type_check') then
    alter table public.reports add constraint reports_target_type_check check (target_type in ('confession','reply'));
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_reason_check') then
    alter table public.reports add constraint reports_reason_check check (reason in ('names_me','harassment','private_info','hate_or_threat','spam','other'));
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_details_check') then
    alter table public.reports add constraint reports_details_check check (char_length(details) <= 300);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_reporter_hash_check') then
    alter table public.reports add constraint reports_reporter_hash_check check (reporter_hash ~ '^[a-f0-9]{64}$');
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.reports'::regclass and conname='reports_check') then
    alter table public.reports add constraint reports_check check ((target_type='confession' and reply_id is null and target_id=confession_id) or (target_type='reply' and reply_id is not null and target_id=reply_id));
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='app_private.api_rate_limits'::regclass and conname='api_rate_limits_key_check') then
    alter table app_private.api_rate_limits add constraint api_rate_limits_key_check check (length(key)=64);
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='app_private.api_rate_limits'::regclass and conname='api_rate_limits_hits_check') then
    alter table app_private.api_rate_limits add constraint api_rate_limits_hits_check check (hits>0);
  end if;
end $$;
alter table public.confessions alter column id set not null;
alter table public.confessions alter column created_at set not null;
alter table public.confessions alter column recipient_to set not null;
alter table public.confessions alter column content set not null;
alter table public.search_terms alter column term set not null;
alter table public.search_terms alter column hits set not null;
alter table public.replies alter column id set not null;
alter table public.replies alter column confession_id set not null;
alter table public.replies alter column song_name set not null;
alter table public.replies alter column artist_name set not null;
alter table public.replies alter column spotify_track_id set not null;
alter table public.replies alter column created_at set not null;
alter table public.reports alter column id set not null;
alter table public.reports alter column target_type set not null;
alter table public.reports alter column target_id set not null;
alter table public.reports alter column confession_id set not null;
alter table public.reports alter column reason set not null;
alter table public.reports alter column created_at set not null;
alter table app_private.api_rate_limits alter column key set not null;
alter table app_private.api_rate_limits alter column hits set not null;
alter table app_private.api_rate_limits alter column expires_at set not null;
alter table public.reports alter column reporter_hash drop not null;
-- This relaxes a constraint only; no hash values are changed by the migration.

create index if not exists confessions_created_at_idx on public.confessions(created_at desc);
create index if not exists confessions_visible_created_idx on public.confessions(created_at desc) where is_hidden=false;
create index if not exists search_terms_popular_idx on public.search_terms(hits desc,term asc) where hits>=3;
create index if not exists replies_parent_created_idx on public.replies(confession_id,created_at);
create index if not exists replies_visible_parent_idx on public.replies(confession_id,created_at) where is_hidden=false;
create index if not exists reports_target_idx on public.reports(target_type,target_id);
create index if not exists reports_confession_idx on public.reports(confession_id);
create index if not exists reports_reply_idx on public.reports(reply_id) where reply_id is not null;
create index if not exists reports_hash_expiry_idx on public.reports(created_at) where reporter_hash is not null;
create index if not exists api_rate_limits_expiry_idx on app_private.api_rate_limits(expires_at);

create extension if not exists pg_trgm with schema extensions;
-- pg_trgm may already live in public. Use its real operator-class schema.
do $$ declare extension_schema text; begin
  select n.nspname into extension_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm';
  execute format('create index if not exists confessions_recipient_trgm_idx on public.confessions using gin (recipient_to %I.gin_trgm_ops)',extension_schema);
end $$;

create or replace function public.consume_api_rate_limit(p_key text, p_window_seconds integer, p_limit integer)
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

create or replace function public.increment_search_term(p_term text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized text := lower(btrim(p_term));
begin
  if normalized is null or char_length(normalized) not between 2 and 40 then
    return;
  end if;
  insert into public.search_terms (term, hits, last_searched)
  values (normalized, 1, now())
  on conflict (term) do update
    set hits = public.search_terms.hits + 1,
        last_searched = excluded.last_searched;
end;
$$;

revoke all on function public.increment_search_term(text) from public, anon, authenticated;
grant execute on function public.increment_search_term(text) to service_role;


create or replace function public.submit_content_report(
  p_target_type text, p_target_id uuid, p_reason text, p_details text,
  p_reporter_hash text, p_threshold integer, p_urgent boolean
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare parent_id uuid; total integer; was_hidden boolean; was_review boolean; new_report uuid;
begin
  if p_threshold is null or p_threshold not between 1 and 20 or p_reporter_hash is null or p_reporter_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid report parameters';
  end if;
  if p_target_type = 'confession' then parent_id := p_target_id;
  elsif p_target_type = 'reply' then
    select confession_id into parent_id from public.replies where id=p_target_id;
  else raise exception 'Invalid target'; end if;
  -- Parent-first lock ordering coordinates reports, reply caps, and deletion.
  perform id from public.confessions where id=parent_id and is_hidden=false for update;
  if not found then return jsonb_build_object('notify',false); end if;
  if p_target_type = 'reply' then
    select is_hidden,needs_review into was_hidden,was_review from public.replies where id=p_target_id and confession_id=parent_id for update;
    if not found or was_hidden then return jsonb_build_object('notify',false); end if;
  else
    select is_hidden,needs_review into was_hidden,was_review from public.confessions where id=parent_id;
  end if;
  insert into public.reports(target_type,target_id,confession_id,reply_id,reason,details,reporter_hash)
    values(p_target_type,p_target_id,parent_id,case when p_target_type='reply' then p_target_id else null end,p_reason,p_details,p_reporter_hash)
    on conflict(target_type,target_id,reporter_hash) do nothing returning id into new_report;
  if new_report is null then
    -- A duplicate can escalate urgency, but never adds another vote.
    if p_urgent and not was_review then
      update public.reports set reason=p_reason,details=p_details where target_type=p_target_type and target_id=p_target_id and reporter_hash=p_reporter_hash;
      if p_target_type='confession' then update public.confessions set needs_review=true where id=parent_id;
      else update public.replies set needs_review=true where id=p_target_id; end if;
      return jsonb_build_object('notify',true,'confession_id',parent_id);
    end if;
    return jsonb_build_object('notify',false);
  end if;
  -- One retained row per distinct daily hash; purging hashes never erases counts.
  select count(*) into total from public.reports where target_type=p_target_type and target_id=p_target_id;
  if p_target_type='confession' then
    update public.confessions set is_hidden=(is_hidden or total>=p_threshold),needs_review=(needs_review or p_urgent or total>=p_threshold) where id=parent_id;
  else
    update public.replies set is_hidden=(is_hidden or total>=p_threshold),needs_review=(needs_review or p_urgent or total>=p_threshold) where id=p_target_id;
  end if;
  return jsonb_build_object('notify',((p_urgent and not was_review) or (total>=p_threshold and not was_hidden)),'confession_id',parent_id);
end; $$;

create or replace function public.add_song_reply(p_parent uuid, p_track jsonb, p_note text, p_cap integer)
returns text language plpgsql security invoker set search_path = '' as $$
declare parent_row public.confessions%rowtype; total integer;
begin
  if p_cap is null or p_cap not between 1 and 100 then raise exception 'Invalid cap'; end if;
  select * into parent_row from public.confessions where id=p_parent for update;
  if not found or parent_row.is_hidden then return 'missing'; end if;
  if not parent_row.allow_replies then return 'disabled'; end if;
  select count(*) into total from public.replies where confession_id=p_parent;
  if total>=p_cap then return 'full'; end if;
  insert into public.replies(confession_id,song_name,artist_name,album_art,spotify_url,spotify_track_id,note)
    values(p_parent,p_track->>'song_name',p_track->>'artist_name',p_track->>'album_art',p_track->>'spotify_url',p_track->>'spotify_track_id',p_note);
  return 'created';
end; $$;

create or replace function public.visible_top_searches(p_limit integer default 8)
returns table(term text,hits integer) language sql stable security invoker set search_path = '' as $$
  select s.term,s.hits from public.search_terms s where s.hits>=3
  and exists(select 1 from public.confessions c where c.is_hidden=false and strpos(lower(c.recipient_to),s.term)>0)
  order by s.hits desc,s.term asc limit greatest(1,least(20,p_limit));
$$;

-- Public projections use a single statement snapshot of parent and moderation.
create or replace function public.confession_preview(p_id uuid)
returns table(recipient_to text) language sql stable security invoker set search_path = '' as $$
  select c.recipient_to from public.confessions c
  where c.id=p_id and c.is_hidden=false and c.needs_review=false
  and not exists(select 1 from public.reports r where r.confession_id=c.id);
$$;

create or replace function public.visible_song_replies(p_id uuid)
returns table(id uuid,confession_id uuid,song_name text,artist_name text,album_art text,
  spotify_url text,spotify_track_id text,note text,created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select r.id,r.confession_id,r.song_name,r.artist_name,r.album_art,r.spotify_url,r.spotify_track_id,r.note,r.created_at
  from public.replies r join public.confessions c on c.id=r.confession_id
  where c.id=p_id and c.is_hidden=false and c.allow_replies=true and r.is_hidden=false
  order by r.created_at asc,r.id asc limit 20;
$$;

-- Run this from the hourly pg_cron job (see docs/features.md).
create or replace function public.purge_report_hashes(p_days integer default 14)
returns integer language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  if p_days not between 1 and 14 then raise exception 'Invalid retention'; end if;
  update public.reports set reporter_hash=null where reporter_hash is not null and created_at<=now()-make_interval(days=>p_days);
  get diagnostics changed=row_count; return changed;
end; $$;

revoke all on function public.submit_content_report(text,uuid,text,text,text,integer,boolean) from public,anon,authenticated;
revoke all on function public.add_song_reply(uuid,jsonb,text,integer) from public,anon,authenticated;
revoke all on function public.visible_top_searches(integer) from public,anon,authenticated;
revoke all on function public.purge_report_hashes(integer) from public,anon,authenticated;
grant execute on function public.submit_content_report(text,uuid,text,text,text,integer,boolean) to service_role;
grant execute on function public.add_song_reply(uuid,jsonb,text,integer) to service_role;
grant execute on function public.visible_top_searches(integer) to service_role;
grant execute on function public.purge_report_hashes(integer) to service_role;
revoke all on function public.confession_preview(uuid) from public,anon,authenticated;
revoke all on function public.visible_song_replies(uuid) from public,anon,authenticated;
grant execute on function public.confession_preview(uuid) to service_role;
grant execute on function public.visible_song_replies(uuid) to service_role;

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
  set poke_count = coalesce(poke_count, 0) + p_amount
  where id = p_confession_id
    and is_hidden = false
  returning poke_count into v_new_count;

  return v_new_count;
end;
$$;

revoke all on function public.poke_confession(uuid, int) from public, anon, authenticated;
grant execute on function public.poke_confession(uuid, int) to service_role;

-- Private schema stays unexposed. Checker receives only a success boolean,
-- never counter keys/values; identifiers come from a fixed allowlist.
create or replace function public.check_rate_limit_column(p_column text)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_column is null or p_column not in ('key','hits','expires_at') then
    raise exception 'Invalid schema probe' using errcode='22023';
  end if;
  execute format('select %I from app_private.api_rate_limits limit 1',p_column);
  return true;
end $$;
revoke all on function public.check_rate_limit_column(text) from public,anon,authenticated;
grant execute on function public.check_rate_limit_column(text) to service_role;

commit;
notify pgrst, 'reload schema';
