import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { testDatabase } from './helpers/d1';
import { browserResult, historySubmission } from './fixtures/history';
import { syncBrowserHistory, parseBrowserHistory } from '../src/worker/results/history-sync';
import {
  saveResult,
  listHistory,
  publicResult,
  softDeleteResult,
} from '../src/worker/results/repository';
import { handleRequest } from '../src/worker/router';
import { createAuth } from '../src/worker/auth/config';
import type { Env } from '../src/worker/types';
import { browserSnapshot } from '../src/client/history/sync';

let database: ReturnType<typeof testDatabase>;
beforeEach(() => {
  database = testDatabase();
  database.sqlite.exec(
    `INSERT INTO "user" VALUES ('alice','Alice','alice@example.com',1,NULL,1,1), ('bob','Bob','bob@example.com',1,NULL,1,1)`,
  );
});
afterEach(() => database.sqlite.close());
const identity = {
  userId: null,
  sessionKey: 'original-measurement-session',
  ip: '2400:adca::1234',
  network: { colo: 'LHE', country: 'PK' },
  userAgent: 'Original browser',
  language: 'en',
};

describe('account history synchronization', () => {
  it('claims an existing guest result without duplicating or replacing full original data', async () => {
    const input = browserResult();
    const row = await saveResult(database.db, historySubmission(input), identity);
    const entry = { ...input, shareId: row.share_id };
    expect((await syncBrowserHistory(database.db, 'alice', [entry])).syncedIds).toEqual([input.id]);
    expect((await syncBrowserHistory(database.db, 'alice', [entry])).syncedIds).toEqual([input.id]);
    const stored = database.sqlite.prepare('SELECT * FROM results').get()!;
    expect(stored.user_id).toBe('alice');
    expect(stored.ip).toBe(identity.ip);
    expect(JSON.parse(stored.samples_json as string).download).toHaveLength(1);
    expect(database.sqlite.prepare('SELECT COUNT(*) AS count FROM results').get()!.count).toBe(1);
    expect((await listHistory(database.db, 'alice', null)).total).toBe(1);
  });

  it('imports pre-cloud browser summaries with their original date and no invented IP', async () => {
    const entry = browserResult();
    await syncBrowserHistory(database.db, 'alice', [entry]);
    await syncBrowserHistory(database.db, 'alice', [entry]);
    const stored = database.sqlite.prepare('SELECT * FROM results').get()!;
    expect(stored.created_at).toBe(entry.date);
    expect(stored.ip).toBeNull();
    expect(stored.method_version).toBe('legacy-import');
    expect(database.sqlite.prepare('SELECT COUNT(*) AS count FROM results').get()!.count).toBe(1);
  });

  it('cannot claim someone’s anonymous record using a public share ID', async () => {
    const entry = browserResult();
    const row = await saveResult(database.db, historySubmission(entry), identity);
    const stolen = { ...entry, id: row.share_id, shareId: row.share_id };
    expect((await syncBrowserHistory(database.db, 'bob', [stolen])).syncedIds).toEqual([]);
    expect(database.sqlite.prepare('SELECT user_id FROM results').get()!.user_id).toBeNull();
  });

  it('does not transfer another account’s result even if an old browser cache contains its private ID', async () => {
    const entry = browserResult();
    await saveResult(database.db, historySubmission(entry), { ...identity, userId: 'alice' });
    const sync = await syncBrowserHistory(database.db, 'bob', [entry]);
    expect(sync.syncedIds).toEqual([]);
    expect(sync.discardedIds).toEqual([entry.id]);
    expect(database.sqlite.prepare('SELECT user_id FROM results').get()!.user_id).toBe('alice');
  });

  it('acknowledges deleted own snapshots without resurrecting them or exporting them at logout', async () => {
    const entry = browserResult();
    const row = await saveResult(database.db, historySubmission(entry), {
      ...identity,
      userId: 'alice',
    });
    const snapshot = browserSnapshot([publicResult(row, 'https://example.com')], 'alice');
    await softDeleteResult(database.db, row.share_id, 'alice');
    expect((await syncBrowserHistory(database.db, 'alice', snapshot)).syncedIds).toEqual([
      row.share_id,
    ]);
    const page = await listHistory(database.db, 'alice', null);
    expect(page.total).toBe(0);
    expect(
      browserSnapshot(
        page.results.map((result) => publicResult(result, 'https://example.com')),
        'alice',
      ),
    ).toEqual([]);
    expect(
      database.sqlite.prepare('SELECT deleted_at FROM results').get()!.deleted_at,
    ).toBeTruthy();
  });

  it('validates import size and summary values', () => {
    const entry = browserResult();
    expect(() => parseBrowserHistory(Array(21).fill(entry))).toThrow();
    expect(() =>
      parseBrowserHistory([{ ...entry, metrics: { ...entry.metrics, download: -1 } }]),
    ).toThrow();
  });

  it('requires authenticated, same-origin access to the sync endpoint', async () => {
    const secret = 'local-history-test-secret-at-least-32-bytes';
    const env = {
      DB: database.db,
      BETTER_AUTH_URL: 'http://localhost:5180',
      BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: 'local',
      GOOGLE_CLIENT_SECRET: 'local',
    } as Env;
    const auth = createAuth(env);
    const context = await auth.$context;
    const session = await context.internalAdapter.createSession('alice');
    const signature = createHmac('sha256', secret).update(session.token).digest('base64');
    const cookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
    const entry = browserResult();
    const call = (headers: Record<string, string>) =>
      handleRequest(
        new Request('http://localhost:5180/api/history/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify([entry]),
        }),
        env,
      );
    expect((await call({})).status).toBe(401);
    expect((await call({ Cookie: cookie, Origin: 'https://other.example' })).status).toBe(403);
    const response = await call({ Cookie: cookie });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ syncedIds: [entry.id], remaining: 0 });
  });
});
