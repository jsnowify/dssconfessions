-- Migration: 20261018140000_replies_tracklist_cap.sql
-- Description: Race-safe atomic reply insertion with 10-reply mixtape tracklist cap,
--              status reporting (ok, full, disabled, not_found), and unconstrained
--              visible reply ordering for legacy threads.

-- 1. Atomic Race-Safe Add Reply RPC
create or replace function public.add_reply(
  p_confession_id uuid,
  p_track jsonb,
  p_note text default null,
  p_max int default 10
) returns jsonb as $$
declare
  v_parent record;
  v_count int;
  v_new_reply record;
begin
  -- Parent-first lock coordinates concurrent replies, reports, and deletions
  select id, is_hidden, allow_replies into v_parent
  from public.confessions
  where id = p_confession_id
  for update;

  if v_parent.id is null or v_parent.is_hidden then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not v_parent.allow_replies then
    return jsonb_build_object('status', 'disabled');
  end if;

  -- Visible count: only active, unhidden replies count towards the tracklist cap
  select count(*) into v_count
  from public.replies
  where confession_id = p_confession_id and is_hidden = false;

  if v_count >= coalesce(p_max, 10) then
    return jsonb_build_object(
      'status', 'full',
      'count', v_count,
      'max', coalesce(p_max, 10)
    );
  end if;

  -- Insert the new reply
  insert into public.replies (
    confession_id,
    song_name,
    artist_name,
    album_art,
    spotify_url,
    spotify_track_id,
    note
  ) values (
    p_confession_id,
    coalesce(p_track->>'song_name', p_track->>'name'),
    coalesce(p_track->>'artist_name', p_track->>'artist'),
    coalesce(p_track->>'album_art', p_track->>'albumArt'),
    coalesce(p_track->>'spotify_url', p_track->>'url'),
    coalesce(p_track->>'spotify_track_id', p_track->>'id'),
    p_note
  ) returning * into v_new_reply;

  return jsonb_build_object(
    'status', 'ok',
    'count', v_count + 1,
    'max', coalesce(p_max, 10),
    'reply', jsonb_build_object(
      'id', v_new_reply.id,
      'confession_id', v_new_reply.confession_id,
      'song_name', v_new_reply.song_name,
      'artist_name', v_new_reply.artist_name,
      'album_art', v_new_reply.album_art,
      'spotify_url', v_new_reply.spotify_url,
      'spotify_track_id', v_new_reply.spotify_track_id,
      'note', v_new_reply.note,
      'created_at', v_new_reply.created_at
    )
  );
end;
$$ language plpgsql security definer set search_path=public,pg_temp;

-- 2. Backward-Compatible Wrapper for Legacy add_song_reply
create or replace function public.add_song_reply(
  p_parent uuid,
  p_track jsonb,
  p_note text,
  p_cap integer
) returns text as $$
declare
  v_res jsonb;
begin
  v_res := public.add_reply(p_parent, p_track, p_note, p_cap);
  if v_res->>'status' = 'ok' then return 'created'; end if;
  if v_res->>'status' = 'not_found' then return 'missing'; end if;
  return v_res->>'status';
end;
$$ language plpgsql security definer set search_path=public,pg_temp;

-- 3. Visible Replies Query (removes hardcoded limit 20 to support legacy threads with > 10 replies)
create or replace function public.visible_song_replies(p_id uuid)
returns table(
  id uuid,
  confession_id uuid,
  song_name text,
  artist_name text,
  album_art text,
  spotify_url text,
  spotify_track_id text,
  note text,
  created_at timestamptz
) as $$
  select
    r.id,
    r.confession_id,
    r.song_name,
    r.artist_name,
    r.album_art,
    r.spotify_url,
    r.spotify_track_id,
    r.note,
    r.created_at
  from public.replies r
  join public.confessions c on c.id = r.confession_id
  where c.id = p_id
    and c.is_hidden = false
    and r.is_hidden = false
  order by r.created_at asc, r.id asc;
$$ language sql stable security definer set search_path=public,pg_temp;

-- 4. Permissions & Service Role Grants
revoke all on function public.add_reply(uuid, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.add_reply(uuid, jsonb, text, integer) to service_role;

revoke all on function public.add_song_reply(uuid, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.add_song_reply(uuid, jsonb, text, integer) to service_role;

revoke all on function public.visible_song_replies(uuid) from public, anon, authenticated;
grant execute on function public.visible_song_replies(uuid) to service_role;

-- 5. Reload Schema Cache
notify pgrst, 'reload schema';
