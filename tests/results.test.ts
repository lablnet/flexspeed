import { afterEach, describe, expect, it } from 'vitest';
import { testDatabase } from './helpers/d1';
import { handleRequest } from '../src/worker/router';
import { parseSubmission } from '../src/worker/results/validation';
import {
  findPublicResult,
  listHistory,
  publicResult,
  saveResult,
  softDeleteResult,
} from '../src/worker/results/repository';
import type { Env } from '../src/worker/types';
import { createAuth } from '../src/worker/auth/config';
import { createHmac } from 'node:crypto';

const databases: ReturnType<typeof testDatabase>[] = [];
afterEach(() => {
  for (const database of databases.splice(0)) database.sqlite.close();
});
function database() {
  const result = testDatabase();
  databases.push(result);
  return result;
}

function submission() {
  return parseSubmission({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    mode: 'lite',
    bytes: 8000,
    metrics: {
      download: 53.3,
      upload: 41.6,
      latency: 38.1,
      jitter: 7.9,
      downloadLatency: 66,
      uploadLatency: 84.7,
      downloadP95: 123,
      uploadP95: 133,
    },
    samples: {
      download: [{ time: 1, value: 53 }],
      upload: [{ time: 1, value: 41 }],
      latency: [{ time: 1, value: 38 }],
    },
    client: { timezone: 'Asia/Karachi' },
  });
}
const identity = (userId: string | null = null) => ({
  userId,
  sessionKey: crypto.randomUUID(),
  ip: '2400:adca::1234',
  network: {
    network: 'Example ISP',
    country: 'PK',
    colo: 'LHE',
    city: 'Karachi',
    cloudflare: { asn: 123 },
  },
  userAgent: 'Test browser',
  language: 'en',
});

describe('persistent result boundaries', () => {
  it('authenticates signed cookies and enforces ownership through history and deletion routes', async () => {
    const { db } = database();
    const secret = 'local-test-only-secret-at-least-32-bytes-long';
    const env = {
      DB: db,
      BETTER_AUTH_URL: 'http://localhost:5180',
      BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: 'local-test-id',
      GOOGLE_CLIENT_SECRET: 'local-test-secret',
    } as Env;
    const auth = createAuth(env);
    const context = await auth.$context;
    const alice = await context.internalAdapter.createUser({
      name: 'Alice',
      email: 'alice@example.com',
      emailVerified: true,
    });
    const bob = await context.internalAdapter.createUser({
      name: 'Bob',
      email: 'bob@example.com',
      emailVerified: true,
    });
    const session = await context.internalAdapter.createSession(alice.id);
    const signature = createHmac('sha256', secret).update(session.token).digest('base64');
    const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
    const aliceResult = await saveResult(db, submission(), identity(alice.id));
    const bobResult = await saveResult(db, submission(), identity(bob.id));

    const call = (path: string, method = 'GET', cookieValue = cookie) =>
      handleRequest(
        new Request(`http://localhost:5180${path}`, { method, headers: { Cookie: cookieValue } }),
        env,
      );
    const history = await call('/api/history');
    expect(history.status).toBe(200);
    expect((await history.json()).results.map((row: { id: string }) => row.id)).toEqual([
      aliceResult.share_id,
    ]);
    expect((await call(`/api/results/${bobResult.share_id}`, 'DELETE')).status).toBe(404);
    expect((await call(`/api/results/${aliceResult.share_id}`, 'DELETE')).status).toBe(200);
    expect((await call(`/api/results/${aliceResult.share_id}`)).status).toBe(404);
    expect((await call('/api/history', 'GET', cookie + 'tampered')).status).toBe(401);
  });
  it('retains full IP, chart samples and metadata while excluding them from public identity fields', async () => {
    const { db, sqlite } = database();
    const input = submission();
    const row = await saveResult(db, input, identity());
    const stored = sqlite.prepare('SELECT * FROM results').get()!;
    expect(stored.ip).toBe('2400:adca::1234');
    expect(JSON.parse(stored.client_json as string).timezone).toBe('Asia/Karachi');
    expect(JSON.parse(stored.samples_json as string)).toEqual(input.samples);
    const output = publicResult(row, 'https://test.example');
    expect(output.shareUrl).toContain('/r/');
    expect(output.posterUrl).toContain('.png');
    expect(JSON.stringify(output)).not.toContain('2400:adca');
    expect(output).not.toHaveProperty('user_id');
    expect(output).not.toHaveProperty('client_json');
  });

  it('makes save retries idempotent for a signed measurement session', async () => {
    const { db, sqlite } = database();
    const input = submission();
    const owner = identity();
    const a = await saveResult(db, input, owner);
    const b = await saveResult(db, input, owner);
    expect(a.share_id).toBe(b.share_id);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM results').get()!.count).toBe(1);
  });

  it('soft deletes only owned results, retains the record and revokes public retrieval', async () => {
    const { db, sqlite } = database();
    sqlite.exec(
      `INSERT INTO "user" VALUES ('alice','Alice','a@example.com',1,NULL,1,1), ('bob','Bob','b@example.com',1,NULL,1,1)`,
    );
    const row = await saveResult(db, submission(), identity('alice'));
    expect(await softDeleteResult(db, row.share_id, 'bob')).toBe(false);
    expect(await softDeleteResult(db, row.share_id, 'alice')).toBe(true);
    expect(await findPublicResult(db, row.share_id)).toBeNull();
    const stored = sqlite.prepare('SELECT * FROM results').get()!;
    expect(stored.deleted_at).toBeTruthy();
    expect(stored.ip).toBe('2400:adca::1234');
    expect((await listHistory(db, 'alice', null)).results).toEqual([]);
  });

  it('paginates complete account history beyond the local 20-result limit', async () => {
    const { db, sqlite } = database();
    sqlite.exec(`INSERT INTO "user" VALUES ('alice','Alice','a@example.com',1,NULL,1,1)`);
    for (let i = 0; i < 56; i++) await saveResult(db, submission(), identity('alice'));
    await saveResult(db, submission(), identity());
    const first = await listHistory(db, 'alice', null);
    const next = await listHistory(db, 'alice', first.nextCursor);
    expect(first.results).toHaveLength(50);
    expect(next.results).toHaveLength(6);
    expect(new Set([...first.results, ...next.results].map((row) => row.id)).size).toBe(56);
    expect(next.nextCursor).toBeNull();
  });

  it('rejects invalid metrics, oversized samples and non-completed results', () => {
    const value = submission();
    expect(() =>
      parseSubmission({ ...value, metrics: { ...value.metrics, download: null } }),
    ).toThrow();
    expect(() =>
      parseSubmission({ ...value, metrics: { ...value.metrics, latency: -1 } }),
    ).toThrow();
    expect(() =>
      parseSubmission({
        ...value,
        samples: { ...value.samples, latency: Array(3001).fill({ time: 1, value: 1 }) },
      }),
    ).toThrow();
  });

  it('requires a measurement token for anonymous saves and login for account history', async () => {
    const { db } = database();
    const env = { DB: db, ASSETS: { fetch: async () => new Response('app') } } as unknown as Env;
    expect(
      (await handleRequest(new Request('http://localhost/api/results', { method: 'POST' }), env))
        .status,
    ).toBe(401);
    expect((await handleRequest(new Request('http://localhost/api/history'), env)).status).toBe(
      401,
    );
  });

  it('uses the D1 auth schema to begin Google OAuth without an email verification flow', async () => {
    const { db, sqlite } = database();
    const env = {
      DB: db,
      BETTER_AUTH_URL: 'http://localhost:5180',
      BETTER_AUTH_SECRET: 'local-test-only-secret-at-least-32-bytes-long',
      GOOGLE_CLIENT_ID: 'local-test-id',
      GOOGLE_CLIENT_SECRET: 'local-test-secret',
    } as Env;
    const response = await createAuth(env).handler(
      new Request('http://localhost:5180/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5180' },
        body: JSON.stringify({ provider: 'google', callbackURL: '/history' }),
      }),
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as { url: string };
    expect(data.url).toContain('accounts.google.com');
    expect(new URL(data.url).searchParams.get('redirect_uri')).toBe(
      'http://localhost:5180/api/auth/callback/google',
    );
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM "user"').get()!.count).toBe(0);
  });
});
