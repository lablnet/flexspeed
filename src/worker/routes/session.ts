import type { RouteContext } from '../types';
import { clientIp } from '../http/request';
import { json } from '../http/response';
import { createSession, sessionSecret } from '../services/session';

export async function sessionRoute({ request, env, url }: RouteContext): Promise<Response> {
  const secret = sessionSecret(env, url);
  if (!secret)
    return json({ error: 'Testing is not configured. Set the SESSION_SECRET Worker secret.' }, 503);

  const allowed = await env.TEST_LIMITER?.limit({ key: clientIp(request) });
  if (allowed && !allowed.success) {
    return json({ error: 'Too many tests. Please wait a minute and try again.' }, 429);
  }

  return json({ token: await createSession(request, secret) });
}
