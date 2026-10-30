/** Measurements must reach the network and must not be transformed by caches. */
export const measurementHeaders = {
  'Cache-Control': 'no-store, no-transform',
  'Timing-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
};

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: measurementHeaders });
}
