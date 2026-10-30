import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectionDetails } from '../src/worker/http/connection';
import { infoRoute } from '../src/worker/routes/info';
import { captureNetwork } from '../src/worker/results/network';
import {
  browserConnectionSnapshot,
  connectionTypeLabel,
} from '../src/client/utils/browser-connection';
import type { RouteContext } from '../src/worker/types';

afterEach(() => vi.unstubAllGlobals());
function request(ip: string, protocol?: string) {
  const req = new Request('https://speed.example/api/info', {
    headers: { 'CF-Connecting-IP': ip },
  });
  Object.defineProperty(req, 'cf', { value: protocol ? { httpProtocol: protocol } : {} });
  return req;
}

describe('connection details', () => {
  it.each([
    ['203.0.113.1', 'IPv4'],
    ['2001:db8::1', 'IPv6'],
  ])('reports %s from the trusted request', async (ip, version) => {
    const req = request(ip, 'HTTP/3');
    const url = new URL(req.url);
    const response = infoRoute({ request: req, url } as RouteContext);
    expect(await response.json()).toMatchObject({ ipVersion: version, httpProtocol: 'HTTP/3' });
    expect(captureNetwork(req, url)).toMatchObject({ ipVersion: version, httpProtocol: 'HTTP/3' });
  });
  it('does not fabricate local or missing protocol details', () => {
    const req = request('203.0.113.1');
    expect(connectionDetails(req, new URL('http://localhost/api/info'))).toEqual({
      httpProtocol: null,
      ipVersion: null,
    });
    expect(connectionDetails(req, new URL(req.url)).httpProtocol).toBeNull();
  });
  it('handles unsupported browsers without inferring a connection type', () => {
    vi.stubGlobal('navigator', {});
    expect(browserConnectionSnapshot()).toBeNull();
    expect(connectionTypeLabel(undefined)).toBe('Unavailable');
    expect(connectionTypeLabel('unknown')).toBe('Unavailable');
  });
  it('keeps effective performance separate from the physical connection type', () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g', saveData: false } });
    expect(browserConnectionSnapshot()).toMatchObject({
      type: null,
      effectiveType: '4g',
      saveData: false,
    });
    expect(connectionTypeLabel('wifi')).toBe('Wi-Fi');
  });
});
