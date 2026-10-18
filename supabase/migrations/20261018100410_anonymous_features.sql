begin;
alter table public.confessions add column if not exists delete_key_hash text;
alter table public.confessions add column if not exists allow_replies boolean not null default true;
alter table public.confessions add column if not exists is_hidden boolean not null default false;
alter table public.confessions add column if not exists needs_review boolean not null default false;
alter table public.confessions enable row level security;
revoke all on public.confessions from public, anon, authenticated;
grant select, insert, update, delete on public.confessions to service_role;
create index if not exists confessions_visible_created_idx on public.confessions(created_at desc) where is_hidden = false;

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  confession_id uuid not null references public.confessions(id) on delete cascade,
  song_name text not null, artist_name text not null, album_art text, spotify_url text,
  spotify_track_id text not null check (spotify_track_id ~ '^[A-Za-z0-9]{22}$'),
  note text check (char_length(note) <= 140),
  is_hidden boolean not null default false,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists replies_parent_created_idx on public.replies(confession_id, created_at);
create index if not exists replies_visible_parent_idx on public.replies(confession_id, created_at) where is_hidden = false;
alter table public.replies enable row level security;
revoke all on public.replies from public, anon, authenticated;
grant select, insert, update, delete on public.replies to service_role;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('confession','reply')),
  target_id uuid not null,
  -- Explicit foreign keys support cascades for polymorphic report targets.
  confession_id uuid not null references public.confessions(id) on delete cascade,
  reply_id uuid references public.replies(id) on delete cascade,
  reason text not null check (reason in ('names_me','harassment','private_info','hate_or_threat','spam','other')),
  details text check (char_length(details) <= 300),
  -- Nullable so identifying hashes can be purged while preserving reports/counts.
  reporter_hash text check (reporter_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(target_type, target_id, reporter_hash),
  check ((target_type = 'confession' and reply_id is null and target_id = confession_id)
      or (target_type = 'reply' and reply_id is not null and target_id = reply_id))
);
create index if not exists reports_target_idx on public.reports(target_type,target_id);
create index if not exists reports_confession_idx on public.reports(confession_id);
create index if not exists reports_reply_idx on public.reports(reply_id) where reply_id is not null;
create index if not exists reports_hash_expiry_idx on public.reports(created_at) where reporter_hash is not null;
alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
grant select, insert, update, delete on public.reports to service_role;

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
commit;
