// Isolated PostgreSQL and upstream fixtures. Never loads .env or live services.
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { once } = require('node:events');
const root = resolve(__dirname, '../..');
const serverRequire = createRequire(resolve(root, 'server/package.json'));
const { PGlite } = serverRequire('@electric-sql/pglite');
const { pg_trgm } = serverRequire('@electric-sql/pglite/contrib/pg_trgm');
const { adapter } = require('../../server/test-support/database.cjs');
const { createApp } = require('../../server/app');
const { hashAdminPassword } = require('../../server/bots/admin-auth');
const ID = '11111111-1111-4111-8111-111111111111';
const TRACK = '0123456789ABCDEFGHIJKL';
const PASSWORD = 'performance-fixture-password';

async function startFixture({ decorateDatabase = database => database } = {}) {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.confessions(id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),recipient_to text not null,
      sender_from text default 'Anonymous',content text not null,song_name text,
      artist_name text,album_art text,spotify_url text);`);
  for (const file of ['20261018110837_schema_catch_up.sql',
    '20261018140000_replies_tracklist_cap.sql', '20261019024537_confession_bots.sql',
    '20261019034400_bot_disclosure_in_recipient.sql', '20261019043830_curated_horror_library.sql', '20261019043834_replies_500.sql',
    '20261020014012_optimized_confession_feed.sql']) {
    await db.exec(readFileSync(resolve(root, 'supabase/migrations', file), 'utf8'));
  }
  await db.query(`insert into public.confessions(id,recipient_to,sender_from,content,
    song_name,artist_name,spotify_url) values($1,'SAMPLE','ANONYMOUS',$2,'Sample Song','Sample Artist',$3)`,
    [ID, 'A fictional sample message for a local performance check. Thank you for sharing the music and making ordinary afternoons feel brighter.', `https://open.spotify.com/track/${TRACK}`]);
  await db.exec(`insert into public.confessions(recipient_to,sender_from,content,song_name,artist_name,spotify_url,created_at)
    select 'SAMPLE '||n,'ANONYMOUS','Fictional test message '||n||'. Some days a familiar song is enough to make the walk home feel a little warmer.',
    'Sample Song','Sample Artist','https://open.spotify.com/track/${TRACK}',now()-(n||' minutes')::interval
    from generate_series(1,4999) n; analyze public.confessions;`);
  const env = {
    VERCEL: '1', SUPABASE_SERVICE_ROLE: 'fixture-service-'.repeat(4),
    DELETE_KEY_PEPPER: 'fixture-pepper-'.repeat(4), REPORT_HASH_SECRET: 'fixture-report-'.repeat(4),
    SPOTIFY_CLIENT_ID: 'fixture', SPOTIFY_CLIENT_SECRET: 'fixture',
    BOT_ADMIN_PASSWORD_HASH: await hashAdminPassword(PASSWORD),
    BOT_ADMIN_SESSION_SECRET: 'fixture-session-'.repeat(4), CRON_SECRET: 'fixture-cron-'.repeat(4),
    BOT_AI_MODEL: 'fixture/model', AI_GATEWAY_API_KEY: 'fixture-key',
  };
  const track = { id: TRACK, name: 'Sample Song', artists: [{ name: 'Sample Artist' }],
    album: { images: [] }, external_urls: { spotify: `https://open.spotify.com/track/${TRACK}` } };
  // The adapter is shared with the existing HTTP integration suite.
  const calls = [];
  const database = decorateDatabase(adapter(db, calls));
  const server = createApp({ env, database, background: work => work,
    getToken: async () => 'fixture-token',
    spotify: { get: async url => ({ data: url.endsWith('/search') ? { tracks: { items: [track] } } : track }) },
    botAi: async () => { throw new Error('Generation is outside the performance workload'); },
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { db, calls, env, id: ID, track, password: PASSWORD,
    origin: `http://127.0.0.1:${server.address().port}`,
    close: async () => { await new Promise(r => server.close(r)); await db.close(); } };
}
module.exports = { startFixture };
