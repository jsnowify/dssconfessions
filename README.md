# dssconfessions

Untold words, sent through the song. An anonymous confession platform for the DSSC student community, built with React, Vite, Express, Spotify and Supabase PostgreSQL.

Live frontend: https://dssconfessions.vercel.app/

The frontend and API are live together on Vercel, with Supabase storing the 56 existing confessions. Shared rate limits and feed/search indexes have been applied. The production app no longer depends on Render. See the [deployment and verification report](docs/operations.md).

## Architecture

The browser calls same-origin `/api` endpoints. `api/index.js` exports the Express app as a Vercel Function, while Vercel serves `client/dist` as static assets. The API reads/writes Supabase and proxies Spotify; server credentials stay out of the browser. A separate Render service is unnecessary after the Vercel cutover.

## Local development

Use Node.js 24.x, then install both applications:

```powershell
npm ci --prefix server
npm ci --prefix client
```

Configure `server/.env` using the names in [server/.env.example](server/.env.example). Preserve existing credentials if this file is already configured. Leave `VITE_API_BASE_URL` unset in the frontend environment; Vite proxies `/api` to `http://localhost:5000`.

Run the backend and frontend in separate terminals:

```powershell
npm start
```

```powershell
npm run dev
```

The development UI runs on port 5173. The backend defaults to port 5000; `PORT` can override it, but the Vite proxy target must then be adjusted to match.

## Checks

```powershell
npm run lint
npm run build
npm test
npm run check:live -- https://dssconfessions.vercel.app
```

The live check performs only reads and fails if the deployment serves HTML instead of API JSON or posting is not configured. `/api/health` checks database connectivity, Spotify credential presence and the Delete Key secret required for posting. It returns HTTP 503 when posting configuration is invalid; it does not verify Spotify credentials or perform a database insert.

## Deploying to Vercel

Use the repository root as the Vercel project Root Directory, with Node.js 24.x. Root `vercel.json` defines the build, static output, function region and API routes.

Configure these server environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `DELETE_KEY_PEPPER` — a separate random secret of at least 32 characters, required for posting and author deletion
- `REPORT_HASH_SECRET` — another independent random secret of at least 32 characters, required for anonymous reports

Store secrets as server-only Vercel environment variables for each intended environment, then redeploy: existing deployments keep their original environment. Never rotate `DELETE_KEY_PEPPER` during a routine release, because existing author Delete Keys depend on it. Keep both secrets distinct from each other and from `SUPABASE_SERVICE_ROLE`. Check `/api/health` and run `npm run check:live -- <deployment-url>` before promoting a production build.

Remove `VITE_API_BASE_URL` from Vercel so requests use the same deployment's `/api`. The [shared rate-limit migration](supabase/migrations/20261018080243_serverless_rate_limits.sql) and [feed/search indexes](supabase/migrations/20261018080247_confession_indexes.sql) have been applied to the restored dssconfessions project. For another database, restore the existing confession schema/data first, then apply these migrations before deploying the API. Vercel always uses shared database limits; unavailable limits return HTTP 503. See [operations](docs/operations.md) for verification and cutover details.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Database connectivity, Spotify configuration and posting configuration |
| `GET /api/confessions` | Latest 20 public stories |
| `GET /api/confessions?to=name` | Up to 50 recipient matches |
| `GET /api/search-song?q=title` | Up to five Spotify tracks |
| `POST /api/confess` | Validate and save a story with a server-verified Spotify track |

Submissions accept a recipient of up to 50 characters, optional sender, content of up to 3,000 characters, and `song: { id: "SPOTIFY_TRACK_ID" }`. The server obtains the song title, artist and artwork from Spotify.

## Author

Snowi Wu. Built for educational purposes and inspired by SendTheSong.
