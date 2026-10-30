import assert from 'node:assert/strict';

// Synthetic writes are deliberately restricted to a local development server.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:5180').origin;
assert(
  ['127.0.0.1', 'localhost'].includes(new URL(origin).hostname),
  'Run smoke tests against localhost only.',
);

const tokenResponse = await fetch(`${origin}/api/session`, { method: 'POST' });
assert.equal(tokenResponse.status, 200);
const { token } = await tokenResponse.json();
const result = {
  id: crypto.randomUUID(),
  date: new Date().toISOString(),
  mode: 'lite',
  bytes: 123456,
  metrics: {
    download: 53.3,
    upload: 41.6,
    latency: 38.1,
    jitter: 7.9,
    downloadLatency: 66,
    uploadLatency: 84.7,
    downloadP95: 100,
    uploadP95: 120,
  },
  samples: {
    download: [
      { time: 0, value: 30 },
      { time: 1, value: 53.3 },
    ],
    upload: [
      { time: 0, value: 30 },
      { time: 1, value: 41.6 },
    ],
    latency: [
      { time: 0, value: 38.1 },
      { time: 1, value: 66 },
    ],
  },
  client: { fixture: true, timezone: 'Asia/Karachi' },
};

async function save() {
  const response = await fetch(`${origin}/api/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(result),
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}

const saved = await save();
assert.equal((await save()).id, saved.id, 'Retry must return the same result');
const htmlResponse = await fetch(saved.shareUrl);
assert.equal(htmlResponse.status, 200);
const html = await htmlResponse.text();
assert(html.includes('property="og:image"'));
assert(html.includes('summary_large_image'));
assert(html.includes('53.3 Mbps down'));
assert(html.includes(saved.posterUrl));

const posterResponse = await fetch(saved.posterUrl);
assert.equal(posterResponse.status, 200);
assert.equal(posterResponse.headers.get('Content-Type'), 'image/png');
const png = new Uint8Array(await posterResponse.arrayBuffer());
assert.deepEqual([...png.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
const dimensions = new DataView(png.buffer);
assert.equal(dimensions.getUint32(16), 1200);
assert.equal(dimensions.getUint32(20), 630);

const publicResult = await (await fetch(`${origin}/api/results/${saved.id}`)).json();
for (const field of ['ip', 'user_id', 'client_json', 'network_json', 'session_key'])
  assert(!(field in publicResult), `${field} must remain private`);
assert.equal((await fetch(`${origin}/api/history`)).status, 401);
assert.equal((await fetch(`${origin}/api/results/${saved.id}`, { method: 'DELETE' })).status, 401);
console.log(
  `Passed: D1 saves, idempotent retries, crawler metadata, 1200×630 PNG/R2, public projection, protected history.\nSynthetic result: ${saved.shareUrl}`,
);
