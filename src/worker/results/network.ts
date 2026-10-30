import { isLocalRequest } from '../http/request';

/** Keep the full connection metadata privately, without cookies or auth headers. */
export function captureNetwork(request: Request, url: URL): Record<string, unknown> {
  const cf = isLocalRequest(url)
    ? undefined
    : (request.cf as IncomingRequestCfProperties | undefined);
  return {
    network: cf?.asOrganization ?? null,
    asn: cf?.asn ?? null,
    city: cf?.city ?? null,
    country: cf?.country ?? null,
    colo: cf?.colo ?? null,
    cloudflare: cf ?? null,
    protocol: url.protocol,
  };
}
