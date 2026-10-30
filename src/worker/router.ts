import type { ApiRoute, Env } from './types';
import { isCrossOrigin } from './http/request';
import { json } from './http/response';
import { authorized, sessionSecret } from './services/session';
import { downloadRoute } from './routes/download';
import { infoRoute } from './routes/info';
import { pingRoute } from './routes/ping';
import { sessionRoute } from './routes/session';
import { uploadRoute } from './routes/upload';
import { authConfigured, createAuth } from './auth/config';
import {
  saveResultRoute,
  historyRoute,
  deleteResultRoute,
  publicResultRoute,
} from './routes/results';
import { sharePageRoute, posterRoute } from './routes/share';
import { historySyncRoute } from './routes/history-sync';

const routes: ApiRoute[] = [
  { method: 'GET', path: '/api/info', public: true, handle: infoRoute },
  { method: 'POST', path: '/api/session', public: true, handle: sessionRoute },
  { method: 'GET', path: '/api/ping', handle: pingRoute },
  { method: 'GET', path: '/api/download', handle: downloadRoute },
  { method: 'POST', path: '/api/upload', handle: uploadRoute },
  { method: 'POST', path: '/api/results', handle: saveResultRoute },
  { method: 'GET', path: '/api/history', public: true, handle: historyRoute },
  { method: 'POST', path: '/api/history/sync', public: true, handle: historySyncRoute },
];

/** Apply shared API policy once, leaving route handlers focused on their work. */
export async function handleRequest(
  request: Request,
  env: Env,
  execution?: ExecutionContext,
): Promise<Response> {
  try {
    return await routeRequest(request, env, execution);
  } catch {
    console.error('Request failed', new URL(request.url).pathname);
    return json({ error: 'The request could not be completed. Please try again.' }, 500);
  }
}

async function routeRequest(
  request: Request,
  env: Env,
  execution?: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  const context = { request, env, url, execution };
  const share = /^\/r\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (share && request.method === 'GET') return sharePageRoute(context, share[1]);
  const poster = /^\/og\/([0-9a-f-]{36})\.png$/.exec(url.pathname);
  if (poster && request.method === 'GET') return posterRoute(context, poster[1]);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

  if (url.pathname === '/api/auth/config' && request.method === 'GET')
    return json({ google: authConfigured(env), storage: Boolean(env.DB && env.POSTERS) });
  if (url.pathname.startsWith('/api/auth/')) {
    if (!authConfigured(env)) return json({ error: 'Google sign-in is not configured.' }, 503);
    // Better Auth validates OAuth state, callback destinations, origins and cookies.
    return createAuth(env).handler(request);
  }
  if (isCrossOrigin(request, url))
    return json({ error: 'Cross-origin test requests are not allowed.' }, 403);

  const result = /^\/api\/results\/([0-9a-f-]{36})$/.exec(url.pathname);
  if (result && request.method === 'GET') return publicResultRoute(context, result[1]);
  if (result && request.method === 'DELETE') return deleteResultRoute(context, result[1]);

  const route = routes.find(
    (candidate) => candidate.path === url.pathname && candidate.method === request.method,
  );
  if (!route) return json({ error: 'Unknown endpoint or unsupported method.' }, 404);

  if (!route.public) {
    const secret = sessionSecret(env, url);
    if (!secret)
      return json(
        { error: 'Testing is not configured. Set the SESSION_SECRET Worker secret.' },
        503,
      );
    if (!(await authorized(request, secret)))
      return json({ error: 'Test session expired. Start a new test.' }, 401);
  }

  return route.handle(context);
}
