# Cloudflare deployment: D1, R2 and Google login

The React app and API deploy together as one Worker. D1 stores authentication and every completed test; a private R2 bucket stores generated 1200×630 PNG social posters. No email provider or email-verification flow is needed.

## 1. Create cloud storage

```sh
pnpm install
pnpm exec wrangler login
pnpm exec wrangler d1 create flexspeed
pnpm exec wrangler r2 bucket create flexspeed-posters
```

Copy the D1 `database_id` printed by the create command into `wrangler.jsonc`, replacing `00000000-0000-0000-0000-000000000000`. Keep the `DB` binding and `migrations_dir`. If the database or bucket already exists, reuse it rather than creating another. These commands create real cloud resources; R2 may require enabling the service in your account.

Build after changing bindings, apply migrations to the remote database, and deploy:

```sh
pnpm build
pnpm run db:migrate:remote
pnpm run deploy
```

Use `pnpm run deploy`, not pnpm's built-in `pnpm deploy` command. The existing `SESSION_SECRET` remains in place when you redeploy the same Worker. For a new Worker, set it with `pnpm exec wrangler secret put SESSION_SECRET`.

**PNG rendering is CPU-intensive. Use a Workers plan with sufficient CPU allowance; the Free plan's CPU budget may not support server-side PNG rendering reliably.** D1 and R2 have their own usage limits/pricing. Infinite retention means database and bucket usage grows over time. There is no application cleanup schedule or R2 lifecycle expiration configured here.

## 2. Configure Google OAuth

In Google Cloud Console, create an OAuth client of type **Web application** and configure the consent screen. Add:

- Authorized JavaScript origin: `https://YOUR_DOMAIN`
- Authorized redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`
- For local development, add the exact local origin and matching `/api/auth/callback/google` URL, including the port. Do not mix `localhost` with `127.0.0.1`.

If the OAuth app is in testing mode, add your intended Google test users. Configure its production consent-screen status before allowing the general public to sign in. Request only the standard identity scopes; Flexspeed does not need Gmail, Drive or other Google-service access.

Set these Worker secrets interactively:

```sh
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put BETTER_AUTH_URL
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

- `BETTER_AUTH_SECRET`: a new random value of at least 32 bytes, separate from `SESSION_SECRET`. Generate one with `openssl rand -hex 32`.
- `BETTER_AUTH_URL`: your exact canonical origin, such as `https://speed.example.com`.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: from your Google OAuth Web client.

Keep secrets out of source control and `VITE_*` variables. No Google credentials are included in this repository. Until all auth settings are configured, Google login is disabled while anonymous testing and sharing continue to work.

For a custom domain, attach it to the existing Worker, then update `BETTER_AUTH_URL` and Google's allowed origins/callbacks to the same domain. D1 is bound directly to the Worker; browser clients never receive database credentials.

## 3. Local development

```sh
pnpm install
pnpm run db:migrate
pnpm dev
```

D1 and R2 are emulated under `.wrangler/` when their bindings have `remote: false` (or omit `remote`). **The current configuration uses `remote: true`, as selected during setup, so local development accesses the live database and bucket.** Disable remote bindings before synthetic development tests. Unit tests use isolated in-memory databases and mocked browser requests. To test Google OAuth locally, copy `.dev.vars.example` to `.dev.vars`, replace all placeholders and use exactly the configured origin/port when opening the app. `.dev.vars` is ignored by Git.

To run synthetic storage and social-preview checks against a running local server:

```sh
pnpm run test:smoke http://127.0.0.1:5173
```

This creates synthetic local records and posters. It refuses non-local origins. Unit/integration tests run with `pnpm test`; SQLite-backed tests require Node 22.13+ (Node 24+ recommended).

## Behavior and data ownership

- Every successfully submitted completed test is retained in D1, signed in or not. Guest tests also enter browser history immediately. Signed-in tests save directly to the account without a browser copy. Failed saves expose a retry; no share URL is shown until the database acknowledges the save, and logout waits for the latest completed test to save.
- A save requires the signed, IP-bound measurement token. One result per measurement session; identical retries return the same link. These tokens expire after two minutes, so retry promptly. No database writes happen inside ping/download/upload measurements.
- Signed-in saves use the user ID from the verified session cookie, never a user ID supplied in the request body. Account history is paginated without a retention cutoff. On login, guest browser entries are linked using the private original result ID; public share URLs alone cannot claim them. Existing metadata and charts are preserved. Browser-only legacy entries are imported once with their original date and available summary, without inventing missing original IP or chart data. Results already owned by another account are never transferred, and deleted results are never restored.
- Synced browser entries are removed only after server acknowledgement. Failed syncs keep local entries and expose a retry. On successful logout, the latest 20 non-deleted account results are copied to browser history. These cached entries are tagged with the originating account to prevent cross-account imports. A fresh server snapshot is fetched before logout, so records deleted on another device are excluded. Clearing browser history does not remove cloud records. The header count follows the active source: exact account total while signed in, browser list length while signed out.
- Full IPv4/IPv6 address, Cloudflare connection metadata, ISP/ASN, approximate location, edge, user agent, language, available browser/device metadata, metrics and chart samples are retained privately. Browser fields are client-reported; metrics are not tamper-proof certified measurements. Cookies and authorization headers are excluded from result metadata.
- Removing an owned result sets `deleted_at`; it does not delete the row or R2 object. The app and public page/image endpoints stop serving it. Other social platforms may keep an earlier cached preview. Anonymous public links cannot be revoked through a cleared browser history.
- Public links expose only an allowlisted projection: measurements, charts, date, mode, method version, provider, country and connected edge. They exclude IP, exact location, raw metadata, email and account identity. IDs are random, unguessable UUIDs and pages request `noindex`.
- Posters are generated with a self-contained font and WebAssembly SVG renderer. Background rendering uses `waitUntil`; the image endpoint retries on demand if background work failed. R2 is private and does not require a public bucket URL or S3 credentials.
- `/privacy` provides a short overview of collected data, public sharing and optional Google sign-in.

## Verification before production use

Complete a real Google sign-in with your own OAuth client, save a test, sign in on a second device to check account history, and remove one result to verify its link becomes unavailable. Test a public share URL with a social crawler/debugger after deployment; platforms control their own preview caching. Local tests verify the OAuth initiation and signed-session/ownership paths without contacting Google, but cannot validate your live credentials or consent-screen settings.
