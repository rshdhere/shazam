# What's that song?

Paste an Instagram, X, YouTube, Pinterest or TikTok link and get the songs playing in it.

A Lookup downloads the media behind the Link, cuts a few short Clips from it, and asks ACRCloud (then AudD as a fallback) to recognise each one. The page shows every Match with the time it plays, plus the platform's own song label when there is one. Terms are defined in [CONTEXT.md](CONTEXT.md); design decisions are in [docs/adr](docs/adr).

## Set up

You need Node 24+, pnpm 11, Python 3 and accounts with Vercel, ACRCloud and AudD.

Run the setup wizard from the repo root:

```sh
scripts/setup.sh
```

It walks you through each step and saves the values as it goes, so you can stop and re-run it:

1. Sign in to Vercel and link the project (Root Directory `apps/web`).
2. Create the Neon Postgres database and the Vercel Blob store.
3. Enter the ACRCloud and AudD credentials and the engine order.
4. Generate the Extractor secret.
5. Optionally add cookies and a proxy, for when platforms block downloads.
6. Pull the env into `apps/web/.env.local` and migrate the database.

Pushing to `main` then deploys. Each build applies any pending migrations before building.

## Develop

```sh
pnpm install
pnpm --filter web setup:extractor   # Python venv with yt-dlp and ffmpeg
pnpm --filter web dev:extractor     # Extractor on http://localhost:3001
pnpm dev                            # site on http://localhost:3000
```

## Test

```sh
pnpm test                           # integration tests (in-memory Postgres, fake engines)
pnpm --filter web test:extractor    # Python Extractor tests
pnpm check-types && pnpm lint
```

The smoke test runs one real Lookup against a deployment:

```sh
SMOKE_BASE_URL=https://your-deployment.vercel.app pnpm test:e2e
```

If the deployment is protected, also set `VERCEL_AUTOMATION_BYPASS_SECRET`.

## Layout

- `apps/web`: the Next.js site, the Lookup workflow and the Python Extractor (`api/extract.py`)
- `packages/services/lookup`: the Lookup service, recognition engines and Extractor client
- `packages/drizzle`: the schema and migrations
- `packages/types`, `packages/validators`: shared types and Link parsing
- `tests/integration`, `tests/e2e`: the integration tests and the deployed smoke test
