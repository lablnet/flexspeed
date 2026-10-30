import { beforeEach, describe, expect, it } from 'vitest';
import { handleRequest } from '../src/worker/router';
import { MAX_PAYLOAD } from '../src/shared/types';

const env = { ASSETS: { fetch: async () => new Response('app') } } as Parameters<
  typeof handleRequest
>[1];
let token: string;
async function call(path: string, init: RequestInit = {}) {
  return handleRequest(
    new Request(`http://localhost/api/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
    }),
    env,
  );
}
beforeEach(async () => {
  const response = await call('session', { method: 'POST' });
  token = (await response.json()).token;
});
describe('Worker measurement API', () => {
  it('streams exactly the requested bytes without compression or caching', async () => {
    const response = await call('download?bytes=150001');
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(150001);
    expect(response.headers.get('Content-Length')).toBe('150001');
    expect(response.headers.get('Content-Encoding')).toBe('identity');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('rejects invalid or oversized payloads', async () => {
    for (const size of ['0', '-1', '1.5', 'NaN', String(MAX_PAYLOAD + 1)])
      expect((await call(`download?bytes=${size}`)).status).toBe(400);
    const response = await call('upload', {
      method: 'POST',
      headers: { 'Content-Length': String(MAX_PAYLOAD + 1) },
      body: 'too large',
    });
    expect(response.status).toBe(413);
  });
  it('confirms uploaded bytes only after consuming the full body', async () => {
    const response = await call('upload', { method: 'POST', body: new Uint8Array(147_000) });
    expect(await response.json()).toEqual({ bytes: 147_000 });
    expect((await call('upload', { method: 'POST' })).status).toBe(400);
  });
  it('requires a signed session and rejects tampering', async () => {
    expect((await call('ping')).status).toBe(204);
    token = token.replace(/.$/, token.endsWith('a') ? 'b' : 'a');
    expect((await call('ping')).status).toBe(401);
  });
  it('rejects cross-site requests', async () => {
    expect(
      (await call('session', { method: 'POST', headers: { Origin: 'https://other.example' } }))
        .status,
    ).toBe(403);
    expect((await call('ping', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
  });
  it('does not invent network details in development', async () => {
    expect(await (await call('info')).json()).toMatchObject({
      local: true,
      ip: null,
      network: null,
      colo: null,
    });
  });
  it('requires a production secret and applies the test-start limiter', async () => {
    const request = new Request('https://flexspeed.example/api/session', { method: 'POST' });
    expect((await handleRequest(request, env)).status).toBe(503);
    const limited = {
      ...env,
      SESSION_SECRET: 'test-secret',
      TEST_LIMITER: { limit: async () => ({ success: false }) },
    } as Parameters<typeof handleRequest>[1];
    expect((await handleRequest(request, limited)).status).toBe(429);
  });
  it('binds sessions to the connecting IP', async () => {
    expect((await call('ping', { headers: { 'CF-Connecting-IP': '203.0.113.7' } })).status).toBe(
      401,
    );
  });
});
