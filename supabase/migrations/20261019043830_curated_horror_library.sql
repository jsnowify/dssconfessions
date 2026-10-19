-- Curated library uses existing bot settings/jobs; submitted tombstones survive removal.
-- All selection, daily caps and claims retain service-role permissions and DB locking.
begin;
create or replace function public.bot_control(p_action text, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = public, app_private, pg_temp as $$
declare
  b app_private.confession_bots%rowtype;
  j app_private.confession_bot_jobs%rowtype;
  cfg jsonb;
  rid uuid;
  published uuid;
  r jsonb;
  daily_count integer;
  next_slot timestamptz;
begin
  if p_action = 'capabilities' then
    return jsonb_build_object('recipientDisclosure','Short Stories','storyLibrary','pinoy-horror-500','dailyStoryLimit',2);
  end if;
  if p_action is null or p_action not in ('save','claim','draft','publish','fail','remove','library_available') then
    raise exception 'Invalid bot action';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' then raise exception 'Invalid bot input'; end if;
  if p_action = 'library_available' then
    if jsonb_typeof(p_input->'entries') is distinct from 'array'
      or jsonb_array_length(p_input->'entries') > 500 then raise exception 'Invalid story library'; end if;
    return coalesce((select jsonb_agg((e->>'id')::int) from jsonb_array_elements(p_input->'entries') e
      where not exists(select 1 from app_private.confession_bot_jobs jobs
        where jobs.status in ('submitted','working','retry') and
          (jobs.content_digest=e->>'digest' or position(e->>'story' in coalesce(jobs.draft->>'content',''))>0))
      and not exists(select 1 from public.confessions c where position(e->>'story' in c.content)>0)), '[]'::jsonb);
  end if;
  perform pg_advisory_xact_lock(771921, 1);
  next_slot := (date_trunc('day', now() at time zone 'Asia/Manila') +
    case when (now() at time zone 'Asia/Manila')::time < time '08:00' then interval '8 hours'
         when (now() at time zone 'Asia/Manila')::time < time '20:00' then interval '20 hours'
         else interval '32 hours' end) at time zone 'Asia/Manila';
  if p_action = 'save' then
    cfg := p_input->'settings';
    if cfg is null or jsonb_typeof(cfg) <> 'object'
      or length(coalesce(cfg->>'name','')) not between 1 and 50
      or coalesce((cfg->>'intervalMinutes')::int,0) not between 15 and 10080
      or coalesce((cfg->>'postLimit')::int,0) not between 1 and (case when cfg->>'source'='pinoy-horror-500' then 1000 else 100 end)
      or coalesce(cfg->>'source','generated') not in ('generated','pinoy-horror-500')
      or (cfg->>'source'='pinoy-horror-500' and ((cfg->>'intervalMinutes')::int<>720 or cfg->>'language'<>'Tagalog'))
      or jsonb_typeof(cfg->'categories') is distinct from 'array'
      or jsonb_array_length(cfg->'categories') not between 1 and 6
      or not (cfg->'categories' <@ '["campus-life","friendship","quiet-crush","self-growth","gratitude","nostalgia"]'::jsonb)
      or coalesce(cfg->>'style','') not in ('casual','poetic','reflective','mixed')
      or coalesce(cfg->>'tone','') not in ('hopeful','bittersweet','playful','mixed')
      or coalesce(cfg->>'length','') not in ('short','medium','long','mixed')
      or coalesce(cfg->>'language','') not in ('English','Taglish','Cebuano','Tagalog')
      or jsonb_typeof(cfg->'allowReplies') is distinct from 'boolean'
      or jsonb_typeof(p_input->'enabled') is distinct from 'boolean' then
      raise exception 'Invalid bot settings';
    end if;
    if nullif(p_input->>'id','') is null then
      if (select count(*) from app_private.confession_bots) >= 5 then raise exception 'Bot profile limit reached'; end if;
      insert into app_private.confession_bots(settings,enabled) values(cfg,(p_input->>'enabled')::boolean) returning * into b;
    else
      update app_private.confession_bots set settings=cfg,enabled=(p_input->>'enabled')::boolean,
        next_run_at=case when not enabled and (p_input->>'enabled')::boolean then now() else next_run_at end,
        updated_at=now() where id=(p_input->>'id')::uuid returning * into b;
      if not found then raise exception 'Bot not found'; end if;
      -- A configuration edit fences off workers using an older snapshot.
      update app_private.confession_bot_jobs set status='cancelled',updated_at=now()
        where bot_id=b.id and status in ('working','retry');
    end if;
    if cfg->>'source'='pinoy-horror-500' then
      update app_private.confession_bots set next_run_at=next_slot where id=b.id returning * into b;
    end if;
    return to_jsonb(b);
  end if;

  if p_action = 'claim' then
    select count(*) into daily_count from app_private.confession_bot_jobs
      where status='submitted' and draft->>'source'='pinoy-horror-500'
        and updated_at >= (date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila');
    -- Only never-published failures may release a reservation. Submitted jobs,
    -- including removed posts, keep their digest permanently.
    update app_private.confession_bot_jobs set content_digest=null
      where status in ('failed','cancelled') and confession_id is null and draft->>'source'='pinoy-horror-500';
    rid := (p_input->>'requestKey')::uuid;
    if rid is null then raise exception 'Invalid bot request key'; end if;
    select * into j from app_private.confession_bot_jobs where request_key=rid;
    if found then
      if j.status not in ('working','retry') then return jsonb_build_object('state',j.status,'jobId',j.id,'confessionId',j.confession_id); end if;
      if j.lease_until > now() and j.status='working' then return jsonb_build_object('state','busy','jobId',j.id); end if;
      if j.next_attempt_at > now() then return jsonb_build_object('state','retry','jobId',j.id); end if;
      if j.attempts>=3 then
        update app_private.confession_bot_jobs set status='failed',error_code='ATTEMPTS_EXHAUSTED',updated_at=now() where id=j.id;
        return jsonb_build_object('state','failed','jobId',j.id);
      end if;
    end if;
    if exists(select 1 from app_private.confession_bot_jobs where status='working' and lease_until>now()) then
      return jsonb_build_object('state','busy');
    end if;
    update app_private.confession_bot_jobs set status='failed',error_code='ATTEMPTS_EXHAUSTED',updated_at=now()
      where status in ('working','retry') and lease_until<=now() and attempts>=3;
    -- Resume an interrupted job before creating another; only its own draft is reused.
    select jobs.* into j from app_private.confession_bot_jobs jobs
      join app_private.confession_bots bots on bots.id=jobs.bot_id
      where bots.enabled and jobs.attempts<3
        and (coalesce(bots.settings->>'source','generated')<>'pinoy-horror-500' or daily_count<2) and
        ((jobs.status='working' and jobs.lease_until<=now()) or (jobs.status='retry' and jobs.next_attempt_at<=now()))
        and (nullif(p_input->>'botId','') is null or jobs.bot_id=(p_input->>'botId')::uuid)
      order by jobs.created_at limit 1 for update of jobs;
    if found then
      select * into b from app_private.confession_bots where id=j.bot_id;
      update app_private.confession_bot_jobs set status='working',attempts=attempts+1,lease=gen_random_uuid(),
        lease_until=now()+interval '90 seconds',updated_at=now() where id=j.id returning * into j;
    else
      select * into b from app_private.confession_bots
        where enabled and published_count<(settings->>'postLimit')::int
          and (coalesce(settings->>'source','generated')<>'pinoy-horror-500' or daily_count<2)
          and (nullif(p_input->>'botId','') is null or id=(p_input->>'botId')::uuid)
          and (coalesce((p_input->>'manual')::boolean,false) or next_run_at<=now())
        order by next_run_at,created_at limit 1 for update;
      if not found then return jsonb_build_object('state','idle'); end if;
      insert into app_private.confession_bot_jobs(bot_id,request_key) values(b.id,rid) returning * into j;
      update app_private.confession_bots set next_run_at=case when settings->>'source'='pinoy-horror-500' then next_slot else now()+make_interval(mins=>(settings->>'intervalMinutes')::int) end,updated_at=now() where id=b.id;
    end if;
    return jsonb_build_object('state','claimed','job',to_jsonb(j),'settings',b.settings,
      'history',coalesce((select jsonb_agg(draft->>'content') from
        (select draft from app_private.confession_bot_jobs where draft is not null and id<>j.id order by created_at desc limit 30) history),'[]'::jsonb));
  end if;

  if p_action = 'remove' then
    delete from public.confessions c where c.id=(p_input->>'confessionId')::uuid and c.is_automated
      and exists(select 1 from app_private.confession_bot_jobs jobs where jobs.confession_id=c.id);
    return jsonb_build_object('removed',found);
  end if;

  select * into j from app_private.confession_bot_jobs where id=(p_input->>'jobId')::uuid for update;
  if not found then raise exception 'Bot job not found'; end if;
  if j.status='submitted' then return jsonb_build_object('state','submitted','confessionId',j.confession_id); end if;
  if j.status<>'working' or j.lease is distinct from (p_input->>'lease')::uuid or j.lease_until<=now() then
    return jsonb_build_object('state','cancelled');
  end if;
  select * into b from app_private.confession_bots where id=j.bot_id for update;
  if not b.enabled or b.published_count>=(b.settings->>'postLimit')::int then
    update app_private.confession_bot_jobs set status='cancelled',updated_at=now() where id=j.id;
    return jsonb_build_object('state','cancelled');
  end if;

  if p_action = 'draft' then
    if j.draft is not null then return jsonb_build_object('state','ready'); end if;
    if coalesce(p_input->>'digest','') !~ '^[a-f0-9]{64}$' or
       jsonb_typeof(p_input->'draft') is distinct from 'object' then raise exception 'Invalid bot draft'; end if;
    if b.settings->>'source'='pinoy-horror-500' and
      ((p_input->'draft'->>'source') is distinct from 'pinoy-horror-500'
       or coalesce((p_input->'draft'->>'storyId')::int,0) not between 1 and 500
       or (p_input->'draft'->>'storyDigest') is distinct from (p_input->>'digest')) then
      raise exception 'Invalid library draft';
    end if;
    if exists(select 1 from app_private.confession_bot_jobs where content_digest=p_input->>'digest' and id<>j.id) then
      update app_private.confession_bot_jobs set status='duplicate',error_code='DUPLICATE',updated_at=now() where id=j.id;
      return jsonb_build_object('state','duplicate');
    end if;
    update app_private.confession_bot_jobs set draft=p_input->'draft',content_digest=p_input->>'digest',updated_at=now() where id=j.id;
    return jsonb_build_object('state','ready');
  end if;

  if p_action = 'fail' then
    if p_input->>'code' not in ('UPSTREAM','RATE_LIMIT','SAFETY','DUPLICATE','INVALID_OUTPUT','CONFIGURATION','LIBRARY_EXHAUSTED') then raise exception 'Invalid bot error code'; end if;
    update app_private.confession_bot_jobs set
      status=case when attempts<3 and p_input->>'code' in ('UPSTREAM','RATE_LIMIT') then 'retry' else 'failed' end,
      error_code=p_input->>'code',next_attempt_at=now()+make_interval(secs=>greatest(60,least(3600,coalesce((p_input->>'retryAfter')::int,300)))),
      lease_until=now(),updated_at=now() where id=j.id returning * into j;
    if p_input->>'code'='LIBRARY_EXHAUSTED' then
      update app_private.confession_bots set enabled=false,updated_at=now() where id=b.id;
    end if;
    return jsonb_build_object('state',j.status,'jobId',j.id);
  end if;

  if b.settings->>'source'='pinoy-horror-500' and
    (select count(*) from app_private.confession_bot_jobs where status='submitted'
      and draft->>'source'='pinoy-horror-500'
      and updated_at >= (date_trunc('day',now() at time zone 'Asia/Manila') at time zone 'Asia/Manila')) >= 2 then
    update app_private.confession_bot_jobs set status='retry',error_code='RATE_LIMIT',lease_until=now(),next_attempt_at=next_slot where id=j.id;
    return jsonb_build_object('state','retry','jobId',j.id);
  end if;
  r := p_input->'row';
  if j.draft is null or r is null
    or r->>'sender_from' is distinct from 'Mixtape Bot (fiction)'
    or not (
      ((r->>'recipient_to') in ('Short Stories','Automated fiction') and
       (r->>'content') is not distinct from (j.draft->>'content'))
      or ((r->>'recipient_to') is not distinct from 'A fictional listener' and
       (r->>'content') is not distinct from ('[Automated fiction]' || chr(10) || chr(10) || (j.draft->>'content')))
    )
    or length(r->>'content')>3000 or coalesce(r->>'song_name','')='' or coalesce(r->>'artist_name','')=''
    or coalesce(r->>'delete_key_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid bot submission'; end if;
  insert into public.confessions(recipient_to,sender_from,content,song_name,artist_name,album_art,spotify_url,allow_replies,delete_key_hash,is_automated)
    values(r->>'recipient_to',r->>'sender_from',r->>'content',r->>'song_name',r->>'artist_name',r->>'album_art',r->>'spotify_url',
      (r->>'allow_replies')::boolean,r->>'delete_key_hash',true) returning id into published;
  update app_private.confession_bot_jobs set status='submitted',confession_id=published,error_code=null,updated_at=now() where id=j.id;
  update app_private.confession_bots set published_count=published_count+1,
    enabled=published_count+1<(settings->>'postLimit')::int,updated_at=now() where id=b.id;
  return jsonb_build_object('state','submitted','confessionId',published);
end;
$$;
revoke all on function public.bot_control(text,jsonb) from public,anon,authenticated;
grant execute on function public.bot_control(text,jsonb) to service_role;
commit;
notify pgrst, 'reload schema';
