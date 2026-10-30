import { isLocalRequest } from './request';

/** This describes this request to the edge, not every request or dual-stack capability. */
export function connectionDetails(request: Request, url: URL) {
  const local = isLocalRequest(url);
  const cf = local ? undefined : (request.cf as IncomingRequestCfProperties | undefined);
  const ip = local ? null : request.headers.get('CF-Connecting-IP');
  const ipVersion: 'IPv4' | 'IPv6' | null = ip ? (ip.includes(':') ? 'IPv6' : 'IPv4') : null;
  return { httpProtocol: cf?.httpProtocol ?? null, ipVersion };
}
