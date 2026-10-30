# TODO

- [ ] Prototype a packet-loss test using Cloudflare Realtime SFU.
  - Keep the SFU App Secret in the Worker; authorize short, rate-limited test sessions.
  - Validate synthetic WebRTC traffic between two browser connections through the SFU, without camera or microphone access.
  - Start with numbered, unordered messages and no retransmissions; label the result as message delivery loss over the full loopback path.
  - Investigate RTP statistics before claiming packet loss or separate upload/download loss. Record the selected transport and report blocked/failed tests as unavailable.
  - Handle duplicates, reordering, late arrivals and cleanup; save counts, duration and method version in D1. Validate with controlled loss before using results in experience verdicts.

- [ ] Add a DNS-over-HTTPS provider comparison.
  - Query the same domain set directly from the browser; validate CORS support for Cloudflare, Google and Quad9.
  - Separate first-request and warmed timings; show median, p95 and failures. Do not claim to measure the system resolver or promise savings on every web request.

- [ ] Prototype protocol comparisons.
  - Add a bounded WebSocket test and compare it separately with HTTP measurements.
  - Use controlled endpoints for HTTP/2 and HTTP/3, verify the negotiated protocol and handle fallback. Browser fetch cannot force a version; controlled loss/handoff experiments need a separate test setup.

- [ ] Add a download consistency estimate.
  - Sample received-byte deltas in roughly 250–350 ms windows; report variation and repeated throughput dips.
  - Document any score formula and test it with steady and bursty traces. Do not label browser delivery gaps as packet loss, throttling or router buffer drops.

- [ ] Extend sharing and add a CLI client.
  - Reuse generated posters for image downloads; add a public result badge and copyable GitHub Markdown.
  - Provide an inspectable CLI script using the measurement API, with cancellation, bounded traffic and explicit CLI method labeling. Avoid requiring users to pipe remote scripts directly into a shell.
