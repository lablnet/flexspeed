export function isLocalRequest(url: URL): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'local';
}

/** Origin checks restrict browser use; signed sessions also protect API calls. */
export function isCrossOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('Origin');
  return (
    request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
    (origin !== null && origin !== url.origin)
  );
}
