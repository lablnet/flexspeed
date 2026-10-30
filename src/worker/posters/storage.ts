import type { Env } from '../types';
import { publicResult, type ResultRow } from '../results/repository';

/** R2 is private. The Worker exposes only posters for active public results. */
export async function ensurePoster(
  env: Env,
  row: ResultRow,
  origin: string,
): Promise<R2ObjectBody> {
  if (!env.POSTERS || !env.DB) throw new Error('Poster storage is not configured.');
  const key = `posters/v1/${row.share_id}.png`;
  const existing = await env.POSTERS.get(key);
  if (existing) return existing;

  // Load rendering code only after measurement; never on a ping/transfer path.
  const { renderPoster } = await import('./render');
  const png = await renderPoster(publicResult(row, origin));
  await env.POSTERS.put(key, png, { httpMetadata: { contentType: 'image/png' } });
  await env.DB.prepare('UPDATE results SET poster_key = ? WHERE id = ?').bind(key, row.id).run();
  const saved = await env.POSTERS.get(key);
  if (!saved) throw new Error('Poster was not stored.');
  return saved;
}
