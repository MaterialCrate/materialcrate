# Render setup for `materialcrate`

## Fastest option: Blueprint deploy

1. Push this repo to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Select this repository.
4. Render will read `render.yaml` and create:
   - `materialcrate-db` (Postgres)
   - `materialcrate-api` (Node / GraphQL backend)
   - `materialcrate-web` (Next.js frontend)

---

## Service settings used

### `materialcrate-api`

- **Root Directory:** `server`
- **Build Command:** `corepack enable && pnpm install --frozen-lockfile && pnpm render:build`
- **Pre-Deploy Command:** `pnpm render:migrate`
- **Start Command:** `pnpm start`

### `materialcrate-web`

- **Root Directory:** `web`
- **Build Command:** `corepack enable && pnpm install --frozen-lockfile && pnpm render:build`
- **Start Command:** `pnpm start`

---

## Required environment variables

### Backend (`materialcrate-api`)

These are required for the app to fully function:

- `DATABASE_URL` (auto-wired from Render Postgres)
- `JWT_SECRET`
- `AWS_REGION`
- `AWS_S3_BUCKET_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `MAIL_FROM`
- `SES_USER`
- `SES_PASS`

Optional / recommended:

- `SUPPORT_EMAIL`
- `POST_PURGE_INTERVAL_MS`

### Frontend (`materialcrate-web`)

Required:

- `GRAPHQL_ENDPOINT` → `https://materialcrate-api.onrender.com/graphql`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` → `gemini-2.5-flash-lite`
- `NEXT_PUBLIC_LAUNCH_AT` → `2026-04-06T20:00:00`
- `LAUNCH_AT` → `2026-04-06T20:00:00`
- `LAUNCH_PROTECTED_HOSTS` → your live hostnames (comma-separated)

Optional for social login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

---

## Important notes

- The frontend calls the backend through `GRAPHQL_ENDPOINT`, so update it if you rename the API service.
- The backend now binds to `0.0.0.0`, which is required for Render web services.
- Prisma migrations are applied with `pnpm render:migrate` before deploy.
- The launch page lock stays active in production before launch, but development remains usable.

---

## Manual setup (without Blueprint)

If you do not want to use `render.yaml`, create these manually in Render:

1. **Postgres database**
2. **Web Service** for `server/`
3. **Web Service** for `web/`

Then copy the same build/start commands and env vars listed above.
