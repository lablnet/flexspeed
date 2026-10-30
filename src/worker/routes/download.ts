import { MAX_PAYLOAD } from '../../shared/types';
import type { RouteContext } from '../types';
import { json, measurementHeaders } from '../http/response';

/** Pull-driven streaming respects backpressure without buffering the payload. */
export function downloadRoute({ request, url }: RouteContext): Response {
  const bytes = Number(url.searchParams.get('bytes'));
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > MAX_PAYLOAD)
    return json({ error: `Payload must be between 1 and ${MAX_PAYLOAD} bytes.` }, 400);
  const chunk = crypto.getRandomValues(new Uint8Array(65536)); // 64KB
  let remaining = bytes;
  const started = Date.now();
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (request.signal.aborted || Date.now() - started > 20_000) {
        controller.error(new Error('Transfer timed out'));
        return;
      }
      const size = Math.min(chunk.length, remaining);
      controller.enqueue(chunk.slice(0, size));
      remaining -= size;
      if (!remaining) controller.close();
    },
  });
  return new Response(body, {
    headers: {
      ...measurementHeaders,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(bytes),
      'Content-Encoding': 'identity',
    },
    encodeBody: 'manual',
  });
}
