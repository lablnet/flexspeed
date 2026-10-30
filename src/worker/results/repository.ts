import type { PublicResult, ResultSubmission } from '../../shared/results';
import type { Metrics, Mode, NetworkInfo } from '../../shared/types';

export interface ResultRow {
  id: string;
  share_id: string;
  user_id: string | null;
  created_at: string;
  mode: Mode;
  method_version: string;
  metrics_json: string;
  samples_json: string;
  network_json: string;
  bytes: number;
  poster_key: string | null;
  deleted_at: string | null;
}

export interface ResultIdentity {
  userId: string | null;
  sessionKey: string;
  ip: string | null;
  network: Record<string, unknown>;
  userAgent: string | null;
  language: string | null;
}

export async function saveResult(
  db: D1Database,
  result: ResultSubmission,
  identity: ResultIdentity,
): Promise<ResultRow> {
  const shareId = crypto.randomUUID();
  // The signed measurement session makes retries idempotent and allows one result per test.
  await db
    .prepare(
      `INSERT INTO results
    (id, share_id, session_key, user_id, created_at, client_created_at, method_version, mode,
     metrics_json, samples_json, bytes, ip, network_json, client_json, user_agent, accept_language)
    VALUES (?, ?, ?, ?, ?, ?, '1', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_key) DO NOTHING`,
    )
    .bind(
      result.id,
      shareId,
      identity.sessionKey,
      identity.userId,
      new Date().toISOString(),
      result.date,
      result.mode,
      JSON.stringify(result.metrics),
      JSON.stringify(result.samples),
      result.bytes,
      identity.ip,
      JSON.stringify(identity.network),
      JSON.stringify(result.client),
      identity.userAgent,
      identity.language,
    )
    .run();

  const row = await db
    .prepare('SELECT * FROM results WHERE session_key = ?')
    .bind(identity.sessionKey)
    .first<ResultRow>();
  if (!row) throw new Error('Result could not be saved.');
  return row;
}

export function publicResult(row: ResultRow, origin: string): PublicResult {
  const network = JSON.parse(row.network_json) as Partial<NetworkInfo>;
  // Public output is explicit. Never serialize the database row or raw metadata.
  return {
    id: row.share_id,
    date: row.created_at,
    mode: row.mode,
    metrics: JSON.parse(row.metrics_json) as Metrics,
    bytes: row.bytes,
    server: network.colo ?? null,
    network: network.network ?? null,
    country: network.country ?? null,
    samples: JSON.parse(row.samples_json),
    methodVersion: row.method_version,
    shareUrl: `${origin}/r/${row.share_id}`,
    posterUrl: `${origin}/og/${row.share_id}.png`,
  };
}

export function findPublicResult(db: D1Database, shareId: string): Promise<ResultRow | null> {
  return db
    .prepare('SELECT * FROM results WHERE share_id = ? AND deleted_at IS NULL')
    .bind(shareId)
    .first<ResultRow>();
}

export async function listHistory(db: D1Database, userId: string, cursor: string | null) {
  const rows = await db
    .prepare(
      `SELECT * FROM results WHERE user_id = ? AND deleted_at IS NULL
    AND (? IS NULL OR created_at || '|' || id < ?)
    ORDER BY created_at DESC, id DESC LIMIT 51`,
    )
    .bind(userId, cursor, cursor)
    .all<ResultRow>();
  const results = rows.results.slice(0, 50);
  const last = results.at(-1);
  return {
    results,
    nextCursor: rows.results.length > 50 && last ? `${last.created_at}|${last.id}` : null,
    total:
      (
        await db
          .prepare('SELECT COUNT(*) AS total FROM results WHERE user_id = ? AND deleted_at IS NULL')
          .bind(userId)
          .first<{ total: number }>()
      )?.total ?? 0,
  };
}

export async function softDeleteResult(
  db: D1Database,
  shareId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      'UPDATE results SET deleted_at = ? WHERE share_id = ? AND user_id = ? AND deleted_at IS NULL',
    )
    .bind(new Date().toISOString(), shareId, userId)
    .run();
  return result.meta.changes > 0;
}
