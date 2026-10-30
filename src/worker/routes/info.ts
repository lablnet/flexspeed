import { connectionDetails } from '../http/connection';
import type { NetworkInfo } from '../../shared/types';
import type { RouteContext } from '../types';
import { isLocalRequest } from '../http/request';
import { json } from '../http/response';

export function infoRoute({ request, url }: RouteContext): Response {
  const local = isLocalRequest(url);

  const cf = local ? undefined : (request.cf as IncomingRequestCfProperties | undefined);
  const info: NetworkInfo = {
    ip: local ? null : request.headers.get('CF-Connecting-IP'),
    ...connectionDetails(request, url),
    network: cf?.asOrganization ?? null,
    asn: cf?.asn ?? null,
    city: cf?.city ?? null,
    country: cf?.country ?? null,
    colo: cf?.colo ?? null,
    local,
  };
  return json(info);
}
