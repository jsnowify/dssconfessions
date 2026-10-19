-- Move fiction disclosure into the recipient without changing existing data.
-- Retain the old fully-disclosed format for older deployed workers.
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
begin
  if p_action = 'capabilities' then
    return jsonb_build_object('recipientDisclosure','Automated fiction');
  end if;
  if p_action is null or p_action not in ('save','claim','draft','publish','fail','remove') then
    raise exception 'Invalid bot action';
  end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' then raise exception 'Invalid bot input'; end if;
  perform pg_advisory_xact_lock(771921, 1);
  if p_action = 'save' then
    cfg := p_input->'settings';
    if cfg is null or jsonb_typeof(cfg) <> 'object'
      or length(coalesce(cfg->>'name','')) not between 1 and 50
      or coalesce((cfg->>'intervalMinutes')::int,0) not between 15 and 10080
      or coalesce((cfg->>'postLimit')::int,0) not between 1 and 100
      or jsonb_typeof(cfg->'categories') is distinct from 'array'
      or jsonb_array_length(cfg->'categories') not between 1 and 6
      or not (cfg->'categories' <@ '["campus-life","friendship","quiet-crush","self-growth","gratitude","nostalgia"]'::jsonb)
      or coalesce(cfg->>'style','') not in ('casual','poetic','reflective','mixed')
      or coalesce(cfg->>'tone','') not in ('hopeful','bittersweet','playful','mixed')
      or coalesce(cfg->>'length','') not in ('short','medium','long','mixed')
      or coalesce(cfg->>'language','') not in ('English','Taglish','Cebuano')
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
    return to_jsonb(b);
  end if;

  if p_action = 'claim' then
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
      where bots.enabled and jobs.attempts<3 and
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
          and (nullif(p_input->>'botId','') is null or id=(p_input->>'botId')::uuid)
          and (coalesce((p_input->>'manual')::boolean,false) or next_run_at<=now())
        order by next_run_at,created_at limit 1 for update;
      if not found then return jsonb_build_object('state','idle'); end if;
      insert into app_private.confession_bot_jobs(bot_id,request_key) values(b.id,rid) returning * into j;
      update app_private.confession_bots set next_run_at=now()+make_interval(mins=>(settings->>'intervalMinutes')::int),updated_at=now() where id=b.id;
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
    if exists(select 1 from app_private.confession_bot_jobs where content_digest=p_input->>'digest' and id<>j.id) then
      update app_private.confession_bot_jobs set status='duplicate',error_code='DUPLICATE',updated_at=now() where id=j.id;
      return jsonb_build_object('state','duplicate');
    end if;
    update app_private.confession_bot_jobs set draft=p_input->'draft',content_digest=p_input->>'digest',updated_at=now() where id=j.id;
    return jsonb_build_object('state','ready');
  end if;

  if p_action = 'fail' then
    if p_input->>'code' not in ('UPSTREAM','RATE_LIMIT','SAFETY','DUPLICATE','INVALID_OUTPUT','CONFIGURATION') then raise exception 'Invalid bot error code'; end if;
    update app_private.confession_bot_jobs set
      status=case when attempts<3 and p_input->>'code' in ('UPSTREAM','RATE_LIMIT') then 'retry' else 'failed' end,
      error_code=p_input->>'code',next_attempt_at=now()+make_interval(secs=>greatest(60,least(3600,coalesce((p_input->>'retryAfter')::int,300)))),
      lease_until=now(),updated_at=now() where id=j.id returning * into j;
    return jsonb_build_object('state',j.status,'jobId',j.id);
  end if;

  r := p_input->'row';
  if j.draft is null or r is null
    or r->>'sender_from' is distinct from 'Mixtape Bot (fiction)'
    or not (
      ((r->>'recipient_to') is not distinct from 'Automated fiction' and
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
