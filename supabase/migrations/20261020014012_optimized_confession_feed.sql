-- One network round trip for the shared read quota and a bounded public feed.
-- No cache: moderation changes are visible on the next request.
create or replace function public.read_confession_feed(
  p_key text,
  p_window_seconds integer,
  p_read_limit integer,
  p_id uuid default null,
  p_search text default null,
  p_before timestamptz default null,
  p_latest boolean default false,
  p_page_limit integer default 20
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  quota jsonb;
  rows_json jsonb;
  query_sql text;
begin
  if p_page_limit is null or p_page_limit not between 1 and 50 or p_latest is null then
    raise exception 'Invalid feed parameters';
  end if;
  quota := public.consume_api_rate_limit(p_key, p_window_seconds, p_read_limit);
  if not (quota->>'allowed')::boolean then
    return quota;
  end if;

  -- Build only fixed SQL clauses; every request value is bound with USING.
  -- Separate id/search/cursor shapes keep the existing indexes usable without
  -- a generic plan for optional OR filters. Limit before counting reply rows.
  query_sql := 'with page as materialized (
    select c.id, c.recipient_to, c.sender_from, c.content, c.song_name,
      c.artist_name, c.album_art, c.spotify_url, c.created_at,
      c.poke_count, c.is_automated
    from public.confessions c where c.is_hidden = false';
  if p_id is not null then
    query_sql := query_sql || ' and c.id = $2';
  else
    if p_search is not null then
      query_sql := query_sql || ' and c.recipient_to ilike $3';
    end if;
    if p_before is not null then
      query_sql := query_sql || ' and c.created_at < $4';
    end if;
  end if;
  query_sql := query_sql || ' order by c.created_at desc limit $5
    ) select coalesce(jsonb_agg(
      case when $1 then jsonb_build_object(''id'', page.id, ''created_at'', page.created_at)
      else jsonb_build_object(
        ''id'', page.id, ''recipient_to'', page.recipient_to,
        ''sender_from'', page.sender_from, ''content'', page.content,
        ''song_name'', page.song_name, ''artist_name'', page.artist_name,
        ''album_art'', page.album_art, ''spotify_url'', page.spotify_url,
        ''created_at'', page.created_at, ''poke_count'', page.poke_count,
        ''is_automated'', page.is_automated,
        ''reply_count'', (select count(*) from public.replies r
          where r.confession_id = page.id and r.is_hidden = false)
      ) end order by page.created_at desc
    ), ''[]''::jsonb) from page';
  execute query_sql into rows_json
    using p_latest, p_id, p_search, p_before,
      case when p_id is not null then 1 else p_page_limit end;
  return quota || jsonb_build_object('confessions', rows_json);
end;
$$;

revoke all on function public.read_confession_feed(text, integer, integer, uuid, text, timestamptz, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.read_confession_feed(text, integer, integer, uuid, text, timestamptz, boolean, integer)
  to service_role;

notify pgrst, 'reload schema';
