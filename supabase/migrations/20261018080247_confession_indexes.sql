-- The feed orders by created_at; UUID primary keys do not support that ordering.
create index if not exists confessions_created_at_idx
  on public.confessions (created_at desc);

-- A normal btree on recipient_to cannot support the API's ILIKE '%name%' search.
create extension if not exists pg_trgm with schema extensions;
create index if not exists confessions_recipient_trgm_idx
  on public.confessions using gin (recipient_to extensions.gin_trgm_ops);
