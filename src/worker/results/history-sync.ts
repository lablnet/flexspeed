import type { SavedResult } from '../../shared/types';
import { parseSubmission } from './validation';
import type { ResultRow } from './repository';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMIT = 20;

export function parseBrowserHistory(value: unknown): SavedResult[] {
  if (!Array.isArray(value) || value.length > LIMIT) throw new Error('Invalid browser history.');
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || !UUID.test(entry.id))
      throw new Error('Invalid browser result ID.');
    // The result parser validates legacy summaries using the same metric contract.
    const result = parseSubmission({
      ...entry,
      samples: { download: [], upload: [], latency: [] },
      client: {},
    });
    if (entry.shareId !== undefined && !UUID.test(entry.shareId))
      throw new Error('Invalid share ID.');
    if (entry.accountId !== undefined && typeof entry.accountId !== 'string')
      throw new Error('Invalid account reference.');
    if (entry.server != null && (typeof entry.server !== 'string' || entry.server.length > 20))
      throw new Error('Invalid server.');
    return {
      id: result.id,
      date: result.date,
      mode: result.mode,
      metrics: result.metrics,
      bytes: result.bytes,
      server: entry.server ?? null,
      shareId: entry.shareId,
      accountId: entry.accountId,
    };
  });
}

/** Private original IDs are legacy ownership capabilities; public share IDs are not. */
export async function syncBrowserHistory(
  db: D1Database,
  userId: string,
  entries: SavedResult[],
): Promise<{ syncedIds: string[]; discardedIds: string[] }> {
  if (!entries.length) return { syncedIds: [], discardedIds: [] };
  const ids = entries.map((entry) => entry.id);
  const shares = entries.map((entry) => entry.shareId ?? entry.id);
  const placeholders = ids.map(() => '?').join(',');
  const lookup = () =>
    db
      .prepare(
        `SELECT * FROM results WHERE id IN (${placeholders}) OR (user_id = ? AND share_id IN (${placeholders}))`,
      )
      .bind(...ids, userId, ...shares)
      .all<ResultRow>();

  const existing = (await lookup()).results;
  const byId = new Map(existing.map((row) => [row.id, row]));
  const byShare = new Map(
    existing.filter((row) => row.user_id === userId).map((row) => [row.share_id, row]),
  );
  const writes: D1PreparedStatement[] = [];

  for (const entry of entries) {
    const row = byId.get(entry.id) ?? byShare.get(entry.shareId ?? entry.id);
    if (row) {
      // Conditional ownership prevents concurrent sign-ins claiming the same result.
      if (!row.user_id && !row.deleted_at && row.id === entry.id) {
        writes.push(
          db
            .prepare(
              'UPDATE results SET user_id = ? WHERE id = ? AND user_id IS NULL AND deleted_at IS NULL',
            )
            .bind(userId, row.id),
        );
      }
      continue;
    }
    // Account snapshots are never re-created: that could resurrect deleted results.
    if (entry.accountId || entry.shareId) continue;

    // Older browser-only tests lack original connection metadata. Preserve their
    // summary and timestamp without inventing an IP or generating a second test.
    writes.push(
      db
        .prepare(
          `INSERT INTO results
      (id, share_id, session_key, user_id, created_at, client_created_at, method_version, mode,
       metrics_json, samples_json, bytes, ip, network_json, client_json, user_agent, accept_language)
      VALUES (?, ?, ?, ?, ?, ?, 'legacy-import', ?, ?, ?, ?, NULL, ?, ?, NULL, NULL)
      ON CONFLICT DO NOTHING`,
        )
        .bind(
          entry.id,
          crypto.randomUUID(),
          `browser-import:${entry.id}`,
          userId,
          new Date(entry.date).toISOString(),
          entry.date,
          entry.mode,
          JSON.stringify(entry.metrics),
          JSON.stringify({ download: [], upload: [], latency: [] }),
          entry.bytes,
          JSON.stringify({ colo: entry.server }),
          JSON.stringify({
            source: 'browser-history-import',
            importedAt: new Date().toISOString(),
          }),
        ),
    );
  }
  if (writes.length) await db.batch(writes);

  // Re-read after writes to acknowledge only results this account actually owns.
  const owned = (await lookup()).results.filter((row) => row.user_id === userId);
  const syncedIds = entries
    .filter((entry) =>
      owned.some((row) => row.id === entry.id || row.share_id === (entry.shareId ?? entry.id)),
    )
    .map((entry) => entry.id);
  const discardedIds = entries
    .filter((entry) => {
      const row = byId.get(entry.id);
      return (
        !syncedIds.includes(entry.id) &&
        ((row?.user_id && row.user_id !== userId) ||
          (entry.accountId && entry.accountId !== userId))
      );
    })
    .map((entry) => entry.id);
  return { syncedIds, discardedIds };
}
