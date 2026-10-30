import { MAX_PAYLOAD } from '../../shared/types';
import type { RouteContext } from '../types';
import { json } from '../http/response';

/** Acknowledge only after consuming the complete body, never merely its headers. */
export async function uploadRoute({ request }: RouteContext): Promise<Response> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && Number(contentLength) > MAX_PAYLOAD)
    return json({ error: 'Upload too large.' }, 413);
  if (!request.body) return json({ error: 'Upload body required.' }, 400);
  const reader = request.body.getReader();
  let bytes = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 20_000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut || request.signal.aborted) return json({ error: 'Upload interrupted.' }, 408);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_PAYLOAD) {
        await reader.cancel();
        return json({ error: 'Upload too large.' }, 413);
      }
    }
    if (!bytes) return json({ error: 'Upload body required.' }, 400);
    return json({ bytes });
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
