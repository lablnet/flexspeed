import type { RouteContext } from '../types';
import { currentUserId } from '../auth/config';
import { json } from '../http/response';
import { parseBrowserHistory, syncBrowserHistory } from '../results/history-sync';

export async function historySyncRoute({ request, env }: RouteContext): Promise<Response> {
  if (!env.DB) return json({ error: 'Cloud storage is not configured.' }, 503);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: 'Sign in to sync browser history.' }, 401);
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return json({ error: 'JSON required.' }, 400);

  // Read a bounded body so a signed-in caller cannot submit an unlimited import.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Browser history required.' }, 400);
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64 * 1024) {
        await reader.cancel();
        return json({ error: 'Browser history is too large.' }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  let entries;
  try {
    entries = parseBrowserHistory(JSON.parse(text));
  } catch {
    return json({ error: 'Invalid browser history.' }, 400);
  }
  const result = await syncBrowserHistory(env.DB, userId, entries);
  return json({
    ...result,
    remaining: entries.length - result.syncedIds.length - result.discardedIds.length,
  });
}
