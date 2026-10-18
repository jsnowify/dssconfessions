# Unlimited & Counted Poke Feature

## 1. Overview & Architectural Shift

The **Poke** interaction allows visitors to interact with confessions in a tactile, playful way without creating accounts or revealing identity.

### What Changed (from previous 1-poke-per-day model)
- **Unlimited & Cumulative**: Every tap counts. Tapping $N$ times adds $N$ to the confession's total. There is no once-per-day restriction, no per-client lifetime cap, and no cap on a confession's total.
- **Button Never Disabled**: The Poke button remains permanently interactive; there is no "already poked" disabled state.
- **Cleaned Up Poker Identity**: No poker hashing, no IP tracking, and no `poke_log` insertion. The `POKE_HASH_SECRET` server environment variable is completely deprecated and removed.
- **`alreadyPoked` Removed**: The API response no longer includes an `alreadyPoked` boolean flag (it returns `{ "count": number }`).
- **Client-Side Burst Batching**: Rapid taps are coalesced on the client into batches of up to 100 taps sent every ~400ms idle interval. Flush occurs automatically on tab hide or close via `navigator.sendBeacon` or `fetch(..., { keepalive: true })`.
- **Anti-Flood Protection**: Replaced strict user rate-limiting with a generous server anti-flood guard (240 requests/minute per client) designed purely to protect the serverless backend and Postgres database from malicious DDoS/scripts, not to limit humans.

---

## 2. API Contract

### Endpoint: `POST /api/confessions/:id/poke`

#### Request
- **URL Parameter**: `id` — UUID of the confession.
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "amount": 5
  }
  ```
  - `amount` (optional integer, range 1 to 100, defaults to 1 if omitted).

#### Response
- **HTTP 200 OK**:
  ```json
  {
    "count": 42
  }
  ```
- **HTTP 400 Bad Request**:
  - Invalid UUID parameter (`{ "error": "Invalid confession ID" }`).
  - Invalid amount (non-integer, $< 1$, or $> 100$) (`{ "error": "Poke amount must be an integer between 1 and 100" }`).
- **HTTP 404 Not Found**:
  - Confession does not exist or has `is_hidden = true` (`{ "error": "Confession not found or unavailable" }`).
- **HTTP 429 Too Many Requests**:
  - Exceeded anti-flood rate limit (`{ "error": "Too many poke requests. Please slow down." }`).

---

## 3. Database Architecture & Migrations

### Migration: `supabase/migrations/20261018130000_unlimited_poke.sql`

```sql
-- 1. Ensure poke_count column is bigint with zero default
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'confessions'
      and column_name = 'poke_count'
  ) then
    alter table public.confessions add column poke_count bigint not null default 0;
  else
    alter table public.confessions alter column poke_count type bigint;
    alter table public.confessions alter column poke_count set default 0;
    update public.confessions set poke_count = 0 where poke_count is null;
    alter table public.confessions alter column poke_count set not null;
  end if;
end $$;

-- 2. Drop legacy function signatures to prevent PostgREST overload ambiguity
drop function if exists public.poke_confession(uuid, text);
drop function if exists public.purge_old_pokes(integer);

-- 3. Create atomic, single-statement increment RPC
create or replace function public.poke_confession(
  p_confession_id uuid,
  p_amount int default 1
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count bigint;
begin
  if p_amount is null or p_amount < 1 or p_amount > 100 then
    raise exception 'Poke amount must be between 1 and 100' using errcode = 'P0001';
  end if;

  update public.confessions
  set poke_count = poke_count + p_amount
  where id = p_confession_id
    and is_hidden = false
  returning poke_count into v_new_count;

  return v_new_count;
end;
$$;

-- 4. Secure RPC access (service_role only)
revoke all on function public.poke_confession(uuid, int) from public, anon, authenticated;
grant execute on function public.poke_confession(uuid, int) to service_role;

-- 5. Reload PostgREST schema cache
notify pgrst, 'reload schema';
```

### Deprecated `poke_log` Table

The `poke_log` table from the initial 1-poke-per-day prototype is **deprecated** and no longer written to or probed by `npm run check:schema`.

To maintain non-destructive migration safety, the table is preserved intact. If you wish to manually drop it later in the Supabase SQL Editor, run:

```sql
-- Optional manual cleanup when ready:
-- drop table if exists public.poke_log cascade;
```

---

## 4. Frontend Client Implementation

Located at [`client/src/components/ui/PokeButton.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/PokeButton.jsx):

### Key Interactions
1. **Instant Count Increment**: Increments state `count` immediately upon tap.
2. **Snappy Boop Animation**: Applies `.poke-btn--animating` for a 300ms cubic-bezier press-wiggle.
3. **Combo Bubble (`+N`)**: A floating bubble renders on rapid tapping (`+1`, `+2`, ... `+N`), resetting after 600ms of inactivity.
4. **400ms Burst Batching**:
   - Taps accumulate in `pendingTapsRef.current`.
   - A 400ms debounce timer triggers `flushBatch()`. If 100 taps accumulate before 400ms, it flushes immediately.
   - On response, state reconciles with `serverCount + pendingTapsRef.current`.
5. **Partial Failure Rollback**:
   - If a batch fails (e.g. network disconnect), only the `amountToSend` is subtracted back from local state.
   - A toast notification surfaces the server error using BUG-006 standard error extraction.
6. **Flush on Exit (`pagehide` / `visibilitychange`)**:
   - When the user closes the tab or navigates away mid-burst, `navigator.sendBeacon` or `fetch(..., { keepalive: true })` flushes pending taps so no pokes are lost.
7. **Legacy Key Cleanup**:
   - On component mount, any legacy `poked:*` keys in `localStorage` are automatically purged in a `try...catch` block.
8. **Accessibility & Assistive Tech**:
   - Accessible button label: `aria-label="Poke this confession. N pokes so far."`
   - An `aria-live="polite"` region announces **once per batch** (e.g. `"Poked 5 times. 42 total pokes."`) rather than firing on every single rapid tap.
   - Reduced motion (`prefers-reduced-motion: reduce`) suppresses wiggle animation and floating bubbles, retaining immediate count roll.

---

## 5. Security & Privacy Rules

- **Zero Client Identity**: No IP addresses, user IDs, device fingerprints, or cookies are collected or stored for pokes.
- **Fail-Soft Schema Handling**: If the database lacks the `poke_count` column, reading confessions still succeeds with a fallback value of `0` and a schema check warning.
- **Anti-Flood Scope**: Server-side rate limiter enforces a max of 240 requests/minute per client under scope `poke`.
- **Search Terms & Ranking**: Poking never touches `search_terms`, trending weights, or moderation flags.

