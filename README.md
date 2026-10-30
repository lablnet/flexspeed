# Flexspeed

A React and TypeScript internet speed test that measures your browser’s connection to a Cloudflare Worker, with D1 result history, Google sign-in, and shareable social preview images.

The browser times requests and calculates speed, latency and jitter. The Worker sends download data, receives uploads and answers latency requests. Together they measure the connection between the visitor and Cloudflare’s edge. The measurement code is implemented in this repository, without Cloudflare’s speed-test package or a third-party measurement endpoint.

Live app: [flexspeed.lablnet.com](https://flexspeed.lablnet.com).

## Develop

Requires Node.js 22.13+ and pnpm (Node 24+ recommended).

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm run db:migrate
pnpm dev
```

**Check resource bindings before starting:** `remote: true` in `wrangler.jsonc` connects local development to the real Cloudflare resource. Set it to `false` or remove it from the D1 and R2 bindings to use local storage. `db:migrate` applies migrations locally; use `db:migrate:remote` deliberately for the deployed database.

The Cloudflare Vite plugin runs the Worker alongside React locally. Open the URL Vite prints. Local results measure your device to the local Worker, **not your internet connection**. IP, ISP, location and edge metadata are available only after deployment; the UI labels local mode explicitly.

```sh
pnpm test
pnpm build
pnpm preview
```

## Deploy to your Cloudflare account

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create flexspeed
pnpm exec wrangler r2 bucket create flexspeed-posters
```

For a new deployment, configure these bindings in `wrangler.jsonc` using your own resources. Existing deployments can reuse their database and bucket.

| Binding   | Resource                                                          |
| --------- | ----------------------------------------------------------------- |
| `DB`      | D1 database `flexspeed`; use the database ID returned by Wrangler |
| `POSTERS` | R2 bucket `flexspeed-posters`                                     |

If Wrangler adds bindings automatically, use the binding names above. Enable R2 in the Cloudflare dashboard if bucket creation asks you to do so.

Configure secrets, apply migrations, and deploy:

```sh
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put BETTER_AUTH_URL
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm run db:migrate:remote
pnpm run deploy
```

Use `pnpm run deploy` explicitly: `pnpm deploy` is also a built-in pnpm command.

Follow the complete [deployment and Google OAuth setup](docs/deployment.md), including CPU requirements for PNG rendering.

## Automatic deployment from main

Connect the existing `flexspeed` Worker to the repository under **Workers & Pages → flexspeed → Settings → Builds**. Use these settings:

| Setting           | Value                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Production branch | `main`                                                                                                                    |
| Disable builds    | Off                                                                                                                       |
| Build command     | `pnpm test && pnpm run build`                                                                                             |
| Deploy command    | `pnpm exec wrangler deploy`                                                                                               |
| Root directory    | The repository folder containing this app's `package.json` and `wrangler.jsonc`; `/` if the app is at the repository root |
| Preview builds    | Optional; leave disabled for a production-only setup                                                                      |

Cloudflare installs dependencies before running the build command. Commit the pnpm lockfile, and use a Node version compatible with the development requirements above. Keep the Worker name in Wrangler consistent with the existing `flexspeed` Worker.

After connecting, pushes to `main` run tests, build the client and Worker, and deploy on success. The deploy command above avoids rebuilding a second time. Existing runtime secrets remain configured on the Worker; build variables are a separate setting.

Apply new D1 migrations with `pnpm run db:migrate:remote` before deploying code that requires them. The commands above do not run migrations automatically. If enabling previews later, configure their resource isolation and authentication origins before using account or result-saving features.

See [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) for the available settings.

## Environment and Google login

Local values go in `.dev.vars`, which is ignored by Git. Production values are configured through Wrangler secrets. Never put secret values in client code or commit them.

| Variable               | Purpose                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `SESSION_SECRET`       | Signs short-lived measurement tokens bound to the visitor's IP; separate from account login                        |
| `BETTER_AUTH_SECRET`   | Protects Better Auth authentication; use an independent random secret of at least 32 bytes                         |
| `BETTER_AUTH_URL`      | Canonical app origin: `https://flexspeed.lablnet.com` in production, `http://localhost:5173` for local development |
| `GOOGLE_CLIENT_ID`     | Google OAuth web application's client ID                                                                           |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web application's client secret                                                                       |

Create a **Web application** OAuth client in your Google Cloud project. Configure the production JavaScript origin as `https://flexspeed.lablnet.com` and the redirect URI as:

```text
https://flexspeed.lablnet.com/api/auth/callback/google
```

For local login, add the local origin and corresponding `/api/auth/callback/google` redirect URI. The configured origin and actual Vite port must agree. Google provides the sign-in identity, so there is no separate app email/password or email-verification flow. Visitors can run tests and share results without signing in.

## API

| Route                       | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/info`             | Public IP, ASN organization, approximate city/country and connected edge code |
| `POST /api/session`         | Issue a 120-second HMAC session bound to the connecting IP                    |
| `GET /api/ping`             | Empty, uncacheable 204 response                                               |
| `GET /api/download?bytes=N` | Exact streamed binary bytes, maximum 16 MiB                                   |
| `POST /api/upload`          | Read the complete body, maximum 16 MiB, return received byte count            |
| `POST /api/results`         | Persist a completed test using its signed measurement token                   |
| `GET /api/results/:id`      | Public result projection, excluding IP and account data                       |
| `GET /api/history`          | Paginated signed-in account history                                           |
| `POST /api/history/sync`    | Import or link this browser's guest history to the signed-in account          |
| `DELETE /api/results/:id`   | Soft-delete an owned result                                                   |
| `/api/auth/*`               | Better Auth Google OAuth and session endpoints                                |
| `GET /r/:id`                | Result page with server-rendered Open Graph/Twitter metadata                  |
| `GET /og/:id.png`           | Generated 1200×630 PNG served from private R2 storage                         |

Measurement endpoints require `Authorization: Bearer <session>`. Sessions are limited to 10 starts per minute per IP using the Worker rate-limit binding. Cross-origin browser requests are rejected. Request sizes and transfer duration are bounded. Session tokens can be reused within their lifetime; this is basic abuse protection, not a strict per-user bandwidth quota. Set additional account-level traffic monitoring and edge controls appropriate to a public deployment. Avoid challenges or compression rules on measurement routes.

## Client state and architecture

```text
Measurement engine → Zustand measurement store → React subscribers
Completed test → result persistence → Worker → D1 + R2 poster
Google sign-in → Better Auth → account history and browser-history sync
```

`src/client/engine/state.ts` creates the vanilla Zustand measurement store. The engine writes progress, metrics and immutable sample arrays directly to it; components subscribe with Zustand's `useStore`. Byte usage accumulates between progress updates to avoid rendering for every network chunk. Each new run resets its measurement state.

`src/client/stores/TestRuntime.tsx` stays mounted above the routes. It runs the history, persistence and authentication integration hooks once and publishes their actions through `testModel.ts`. There is no TestContext or custom `emit()` callback. Page navigation keeps an active test running.

Authentication remains in its own context. Before logout, the history hook waits for pending saves, syncs browser entries and fetches an account snapshot. It returns a commit function that copies that snapshot into browser history only after logout succeeds. Registration and cleanup live in `useSignOutPreparation.ts`.

The shared API transport in `src/client/api/request.ts` handles fetch and HTTP errors. Measurement requests keep their response bodies available for streaming; JSON endpoints use `requestJson`. `MeasurementClient` adds measurement tokens, cancellation and deadlines.

## Measurement method

- Warm the connection, then take 12 sequential HTTP latency samples. Report the median and mean absolute consecutive delta (jitter).
- Warm each transfer direction independently; exclude these bytes and time from reported throughput.
- Run up to four concurrent transfers (two in data-saver mode). Adapt each payload toward roughly 400 ms of transfer time, bounded between 64 KiB and 16 MiB.
- Count download bytes as the browser consumes stream chunks. Count upload bytes only after the Worker confirms the full body was received. Divide aggregate confirmed bits by elapsed phase time, including in-flight time up to the phase boundary. This conservative upload method can understate slow connections when requests remain incomplete at the deadline. Live upload charts update on acknowledgements, so they can be bursty.
- Probe HTTP latency every 250 ms during each transfer phase. Retain loaded median and p95 in results; display the median in the main interface.
- Transfer phases run up to eight seconds each (four for data saver), or until their byte budget is exhausted. Payload budgets are 400 MiB per direction (40 MiB for data saver), plus warm-ups, probes and protocol overhead. Cancelled upload data usage is an estimate based on attempted payloads.
- Any failed transfer makes the test incomplete; partial tests are not saved as completed results. Timeouts and cancellation abort outstanding requests. Tests do not run automatically on page load.

Results measure the browser-to-Cloudflare path, not a universal ISP line speed. Wi-Fi, VPNs, browser overhead, network routing and device performance influence results. The connected edge is routing-selected and may not be geographically closest. This app does not measure ICMP ping, Wi-Fi SSID, raw packet loss or DNS latency. Calibrate deployed results across real connections before claiming production measurement accuracy.

## Estimated experience

Completed tests and public result pages show Streaming, Gaming and Video calls verdicts: Excellent, Good, Fair, Poor or Unavailable. These are product heuristics calculated from existing measurements, not standardized QoS scores or guarantees for a particular service. They add no test traffic and require no schema migration. Local test results do not show the experience panel on the test page.

The pure calculation lives in `src/shared/quality.ts`; both pages use `QualityPanel`. The weakest relevant measurement determines the verdict:

| Measurement            | Excellent | Good     | Fair      |
| ---------------------- | --------- | -------- | --------- |
| Streaming download     | ≥25 Mbps  | ≥10 Mbps | ≥3 Mbps   |
| Gaming idle latency    | ≤30 ms    | ≤60 ms   | ≤100 ms   |
| Gaming jitter          | ≤5 ms     | ≤15 ms   | ≤30 ms    |
| Gaming loaded latency  | ≤60 ms    | ≤120 ms  | ≤200 ms   |
| Calling download       | ≥10 Mbps  | ≥5 Mbps  | ≥1.5 Mbps |
| Calling upload         | ≥5 Mbps   | ≥3 Mbps  | ≥1 Mbps   |
| Calling jitter         | ≤10 ms    | ≤20 ms   | ≤40 ms    |
| Calling loaded latency | ≤100 ms   | ≤200 ms  | ≤400 ms   |

Measurements worse than the Fair boundary receive Poor. Loaded latency uses the worse of the download-loaded and upload-loaded medians. With at least three valid download samples, streaming uses the lower of aggregate speed and the sample 20th percentile to account for repeated dips; otherwise it explains that consistency could not be assessed. Missing, negative or non-finite required metrics produce Unavailable. Upload acknowledgement chart gaps are not treated as packet loss or reliable evidence of stalls.

These short HTTP measurements target Cloudflare's edge. Actual game servers, streaming providers and calling services may behave differently. Packet loss is not measured.

## Social previews

Each saved result gets a public `/r/:id` link with server-rendered Open Graph and Twitter metadata. The poster contains download/upload speeds and latency metrics.

The Worker turns the SVG poster template into a 1200×630 PNG using `@resvg/resvg-wasm`. `initWasm` and `Resvg` are the JavaScript API; `index_bg.wasm` is the WebAssembly rendering engine from the same package. The bundled Inter font (`src/worker/assets/inter.bin`) ensures text can render in the Worker; keep its accompanying license in the repository.

PNG files are stored in the private `POSTERS` R2 bucket and served through `/og/:id.png`. Generation runs after measurement; the poster endpoint can retry generation when needed. Public results and images exclude IP addresses and account details.

## Privacy and storage

Every completed result is submitted to D1, including full public IP, network/connection metadata, available browser/device information, metrics and chart samples. Records and R2 posters have no automatic expiration. Logged-in deletion sets `deleted_at`, retaining the underlying data while hiding it and revoking public endpoint access. Login syncs guest browser history into the account and clears acknowledged local entries. Signed-in tests save directly to account history. Logout copies the latest 20 non-deleted account results into browser history. Public pages and posters exclude IP and account details. See `/privacy` in the app and [data behavior](docs/deployment.md#behavior-and-data-ownership).

History and theme preferences tolerate unavailable local storage. Worker observability is disabled. UI fonts load from Google Fonts; poster fonts are bundled with their open-source license.

## Source layout

- `src/client/App.tsx`: React Router composition (`/`, `/history`, `/about`, `/login`, `/privacy`, `/r/:id`, and the not-found route)
- `src/client/pages/`: routed test, history, login, public result, privacy, methodology and not-found pages
- `src/client/components/`: reusable layout, chart, test-control and result components
- `src/client/hooks/`: engine lifecycle, network metadata, history and theme hooks
- `src/client/stores/`: Zustand app actions and the persistent runtime bridge
- `src/client/auth/`: authentication context, session lifecycle and logout preparation
- `src/client/api/`: shared HTTP transport and result/history endpoints
- `src/client/history/`: account import and browser snapshot helpers
- `src/client/engine/`: independent orchestration, HTTP client, Zustand measurement state, latency sampling, transfer scheduling, progress and byte transport modules
- `src/client/utils/`: shared formatting and resilient browser storage
- `src/worker/index.ts`: Worker entry point only
- `src/worker/router.ts`: endpoint registration and shared request policy
- `src/worker/routes/`: one handler per endpoint
- `src/worker/services/`: session signing and verification
- `src/worker/auth/`: Google-only Better Auth configuration and session identity
- `src/worker/results/`: validation, private metadata capture and D1 repository
- `src/worker/posters/`: deterministic SVG design, PNG rendering and R2 storage
- `migrations/`: D1 authentication and result schema
- `src/worker/http/`: shared request and response helpers
- `src/shared/`: shared contracts and statistics
- `tests/`: measurement, API integrity, history ownership and React login/logout lifecycle tests

The app includes light/dark themes, responsive charts and layout, reduced-motion support and a data-saver mode. Provision Cloudflare resources and Google OAuth credentials in your own account.

Use `pnpm format` to format source and configuration, and `pnpm format:check` to verify formatting. Comments document measurement decisions, lifecycle boundaries, and cancellation behavior. Each module owns a focused responsibility; React components do not perform measurement requests directly.

## Checks

```sh
pnpm run typecheck
pnpm test
pnpm run format:check
pnpm build
```

`pnpm run test:smoke` exercises the API against a running instance. Inspect `scripts/smoke.mjs` before running it against a deployment: integration requests can use bandwidth and create stored results. Prefer an isolated development environment.
