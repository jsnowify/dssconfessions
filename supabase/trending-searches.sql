-- Run in the Supabase SQL Editor before deploying the feature.
begin;

create table if not exists public.search_terms (
  term text primary key check (char_length(term) between 2 and 40),
  hits integer not null default 0 check (hits >= 0),
  last_searched timestamptz
);
alter table public.search_terms enable row level security;
revoke all on public.search_terms from public, anon, authenticated;
grant select, insert, update on public.search_terms to service_role;

create index if not exists search_terms_popular_idx
  on public.search_terms (hits desc, term asc) where hits >= 3;

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

commit;
