# Anilove Logs Backend

Private account and email backend for Anilove. CockroachDB is the source of
truth for accounts and sessions. Brevo is used only to deliver verification
and password-reset messages. This service is separate from the stream API.

Copy `.env.example` to `.env`, configure the server-only values, apply
`migrations/001_auth.sql` to the main database, then run `pnpm dev` from this
directory or `pnpm exec tsx src/index.ts` from the repository root.

## Vercel

Import this directory as its own Vercel project. Vercel detects `api/index.ts`
as the serverless entry point. Add every variable from `.env.example` in the
Vercel project settings; do not commit `.env`. Apply the SQL migration to
CockroachDB before registering users. The deployment URL is the app's auth
backend URL, for example `https://anilove-logs-backend.vercel.app`.

## Railway

Create a Railway service from this directory or connect the repository and set
the service root to `anilove-logs-backend`. Railway uses `railway.json` to run
`npm run build` and `npm start`. Add the variables from `.env.example` in the
Railway service variables, apply `migrations/001_auth.sql` to CockroachDB, and
generate a public HTTPS domain. Use that domain as the app's dedicated auth
backend URL.

Never expose `DATABASE_URL`, `JWT_SECRET`, or `BREVO_API_KEY` as `EXPO_PUBLIC_*`
variables.
