export const methodology = [
  [
    '01',
    'Speed is one part of the story.',
    'Download and upload measure transferred bits over elapsed time, using adaptive payloads and concurrent HTTP requests. Warm-up transfers are excluded. Data saver uses shorter tests and a lower data budget; it may understate very fast connections.',
  ],
  [
    '02',
    'A ping with a little context.',
    'Latency is the median time for small HTTP requests after warming the connection. It includes browser and HTTP overhead, rather than raw ICMP ping. Jitter is the average absolute change between consecutive idle latency samples.',
  ],
  [
    '03',
    'Life doesn’t happen on an idle network.',
    'Loaded latency probes run during download and upload. A large increase from idle latency can indicate queueing or congestion. Raw packet loss, Wi-Fi names, and DNS timings are not measured by this test.',
  ],
  [
    '04',
    'Your connection, to this edge.',
    'Tests run between your browser and our Worker on Cloudflare’s network. Routing chooses the connected edge; it may not be geographically closest. IP location is approximate, and VPNs affect the visible IP and network provider.',
  ],
  [
    '05',
    'Built to be transparent.',
    'The measurement engine and backend are our own TypeScript code. No Cloudflare speed-test package or third-party measurement endpoint is used. Live upload readings update as the server confirms received bytes.',
  ],
  [
    '06',
    'Your results, saved and shareable.',
    'Completed tests are saved to D1, including full IP and connection metadata, without automatic expiration. Public links and PNG posters exclude IP and account details. Removing account history marks records deleted; it does not erase stored data. Anonymous users keep a separate browser history. Standard mode caps payloads at about 801 MB; data saver caps them at about 81 MB, plus protocol overhead.',
  ],
] as const;
