import { measurementHeaders } from '../http/response';

export function pingRoute(): Response {
  return new Response(null, { status: 204, headers: measurementHeaders });
}
