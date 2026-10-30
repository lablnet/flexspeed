# Flexspeed

A React + TypeScript speed test with an original browser measurement engine, Cloudflare Worker API, D1 result storage, Google login through Better Auth, and R2 social-preview posters. No third-party measurement endpoint or analytics scripts.

## Develop

Requires Node.js 22.13+ and pnpm (Node 24+ recommended).

```sh
pnpm install
pnpm run db:migrate
pnpm dev
```

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

Replace the placeholder D1 database ID in `wrangler.jsonc` with the command's output. Then build, apply remote migrations, configure Worker secrets, and deploy with `pnpm run deploy`. Follow the complete [deployment and Google OAuth setup](docs/deployment.md), including CPU requirements for PNG rendering. Cloud storage and Google credentials have not been provisioned by this change.

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

## Measurement method

- Warm the connection, then take 12 sequential HTTP latency samples. Report the median and mean absolute consecutive delta (jitter).
- Warm each transfer direction independently; exclude these bytes and time from reported throughput.
- Run up to four concurrent transfers (two in data-saver mode). Adapt each payload toward roughly 400 ms of transfer time, bounded between 64 KiB and 16 MiB.
- Count download bytes as the browser consumes stream chunks. Count upload bytes only after the Worker confirms the full body was received. Divide aggregate confirmed bits by elapsed phase time, including in-flight time up to the phase boundary. This conservative upload method can understate slow connections when requests remain incomplete at the deadline. Live upload charts update on acknowledgements, so they can be bursty.
- Probe HTTP latency every 250 ms during each transfer phase. Retain loaded median and p95 in results; display the median in the main interface.
- Transfer phases run up to eight seconds each (four for data saver), or until their byte budget is exhausted. Payload budgets are 400 MiB per direction (40 MiB for data saver), plus warm-ups, probes and protocol overhead. Cancelled upload data usage is an estimate based on attempted payloads.
- Any failed transfer makes the test incomplete; partial tests are not saved as completed results. Timeouts and cancellation abort outstanding requests. Tests do not run automatically on page load.

Results measure the browser-to-Cloudflare path, not a universal ISP line speed. Wi-Fi, VPNs, browser overhead, network routing and device performance influence results. The connected edge is routing-selected and may not be geographically closest. This app does not measure ICMP ping, Wi-Fi SSID, raw packet loss or DNS latency. Calibrate deployed results across real connections before claiming production measurement accuracy.

## Privacy and storage

Every completed result is submitted to D1, including full public IP, network/connection metadata, available browser/device information, metrics and chart samples. Records and R2 posters have no automatic expiration. Logged-in deletion sets `deleted_at`, retaining the underlying data while hiding it and revoking public endpoint access. Login syncs guest browser history into the account and clears acknowledged local entries. Signed-in tests save directly to account history. Logout copies the latest 20 non-deleted account results into browser history. Public pages and posters exclude IP and account details. See `/privacy` in the app and [data behavior](docs/deployment.md#behavior-and-data-ownership).

History and theme preferences tolerate unavailable local storage. Worker observability is disabled. UI fonts load from Google Fonts; poster fonts are bundled with their open-source license.

## Source layout

- `src/client/App.tsx`: React Router route composition only (`/`, `/history`, `/about`)
- `src/client/pages/`: routed speed-test, history, methodology and not-found pages
- `src/client/components/`: reusable layout, chart, test-control and result components
- `src/client/hooks/`: engine lifecycle, network metadata, history and theme hooks
- `src/client/context/`: shared test state that survives page navigation
- `src/client/engine/`: independent orchestration, HTTP client, state snapshots, latency sampling, transfer scheduling, progress and byte transport modules
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
- `tests/`: statistics and API integrity tests

The app includes light/dark themes, responsive charts and layout, reduced-motion support and a data-saver mode. No Cloudflare credentials or deployment are included.

Use `pnpm format` to format source and configuration, and `pnpm format:check` to verify formatting. Comments document measurement decisions, lifecycle boundaries, and cancellation behavior. Each module owns a focused responsibility; React components do not perform measurement requests directly.
