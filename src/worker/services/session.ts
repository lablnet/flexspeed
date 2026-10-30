import type { Env } from '../types';
import { clientIp, isLocalRequest } from '../http/request';

const encoder = new TextEncoder();
const SESSION_TTL = 120_000;

/** The development key is never accepted on a deployed hostname. */
export function sessionSecret(env: Env, url: URL): string | null {
  return env.SESSION_SECRET ?? (isLocalRequest(url) ? 'flexspeed-local-development-only' : null);
}

export async function createSession(request: Request, secret: string): Promise<string> {
  const value = `${Date.now() + SESSION_TTL}.${crypto.randomUUID()}`;
  return `${value}.${await sign(`${value}.${clientIp(request)}`, secret)}`;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function authorized(request: Request, secret: string): Promise<boolean> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  const [expires, nonce, signature] = token.split('.');
  if (!expires || !nonce || !signature || !/^\d+$/.test(expires) || !/^[a-f0-9-]+$/.test(nonce))
    return false;
  const expiry = Number(expires);
  if (expiry < Date.now() || expiry > Date.now() + SESSION_TTL) return false;
  const expected = await sign(`${expires}.${nonce}.${clientIp(request)}`, secret);
  if (signature.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < signature.length; i++)
    difference |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
