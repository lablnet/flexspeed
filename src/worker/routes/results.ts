import type { RouteContext } from '../types';
import { json } from '../http/response';
import { currentUserId } from '../auth/config';
import { readSubmission } from '../results/validation';
import { captureNetwork } from '../results/network';
import {
  saveResult,
  publicResult,
  listHistory,
  softDeleteResult,
  findPublicResult,
} from '../results/repository';
import { ensurePoster } from '../posters/storage';

export async function saveResultRoute({
  request,
  env,
  url,
  execution,
}: RouteContext): Promise<Response> {
  if (!env.DB || !env.POSTERS) return json({ error: 'Cloud storage is not configured.' }, 503);
  let submission;
  try {
    submission = await readSubmission(request);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid result.' }, 400);
  }

  const userId = await currentUserId(request, env);
  // The router has already verified this signed token and its IP binding.
  const sessionKey = request.headers
    .get('Authorization')!
    .replace(/^Bearer /, '')
    .split('.')
    .slice(0, 2)
    .join('.');
  const row = await saveResult(env.DB, submission, {
    userId,
    sessionKey,
    ip: request.headers.get('CF-Connecting-IP'),
    network: captureNetwork(request, url),
    userAgent: request.headers.get('User-Agent'),
    language: request.headers.get('Accept-Language'),
  });

  if (!row.deleted_at) {
    const poster = ensurePoster(env, row, url.origin)
      .then(() => {})
      .catch(() => {
        // A crawler can retry rendering through /og/:id.png if background work fails.
        console.error('Poster generation deferred', row.share_id);
      });
    if (execution) execution.waitUntil(poster);
    else await poster;
  }
  const result = publicResult(row, url.origin);
  return json({ id: result.id, shareUrl: result.shareUrl, posterUrl: result.posterUrl });
}

export async function historyRoute({ request, env, url }: RouteContext): Promise<Response> {
  if (!env.DB) return json({ error: 'Cloud storage is not configured.' }, 503);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: 'Sign in to view account history.' }, 401);
  const cursor = url.searchParams.get('cursor');
  if (cursor && cursor.length > 100) return json({ error: 'Invalid history cursor.' }, 400);
  const page = await listHistory(env.DB, userId, cursor);
  return json({
    results: page.results.map((row) => publicResult(row, url.origin)),
    nextCursor: page.nextCursor,
    total: page.total,
  });
}

export async function deleteResultRoute(context: RouteContext, shareId: string): Promise<Response> {
  if (!context.env.DB) return json({ error: 'Cloud storage is not configured.' }, 503);
  const userId = await currentUserId(context.request, context.env);
  if (!userId) return json({ error: 'Sign in required.' }, 401);
  const changed = await softDeleteResult(context.env.DB, shareId, userId);
  return changed ? json({ deleted: true }) : json({ error: 'Result not found.' }, 404);
}

export async function publicResultRoute(context: RouteContext, shareId: string): Promise<Response> {
  if (!context.env.DB) return json({ error: 'Cloud storage is not configured.' }, 503);
  const row = await findPublicResult(context.env.DB, shareId);
  return row
    ? json(publicResult(row, context.url.origin))
    : json({ error: 'Result not found.' }, 404);
}
