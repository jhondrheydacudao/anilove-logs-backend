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

Never expose `DATABASE_URL`, `DATABASE_SSL_CA`, `JWT_SECRET`, `SMTP_USER`, or
`SMTP_PASS` as `EXPO_PUBLIC_*` variables.

Brevo SMTP uses `smtp-relay.brevo.com` on port `587` with
`SMTP_USER=b94005001@smtp-brevo.com` and the SMTP key as `SMTP_PASS`. The
legacy name `SMTP_PASSWORD` is also accepted. Keep the SMTP key only in
Railway/server environment variables.

Set `EMAIL_ACTION_BASE_URL` to the public URL of this auth service. Email
verification and reset links must point to the auth backend routes, not only
to the native app website.

To send a one-off branded verification email during deployment testing, set
`TEST_EMAIL` temporarily and run `npm run test:email`. Run it from Railway's
service shell or locally with the backend environment loaded, then remove the
temporary variable. This is intentionally a CLI test rather than a public HTTP
endpoint.

For Railway, set `DATABASE_URL` to the CockroachDB connection string with
`sslmode=require` and add the complete CockroachDB CA PEM as
`DATABASE_SSL_CA`. Use literal `\n` line breaks in Railway's variable value.
Do not use a Windows `sslrootcert=C:/...` path because that file does not exist
inside Railway.
