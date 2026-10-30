import type { RouteContext } from '../types';
import { findPublicResult, publicResult } from '../results/repository';
import { escapeHtml } from '../posters/template';
import { ensurePoster } from '../posters/storage';

export async function sharePageRoute(
  { request, url, env }: RouteContext,
  shareId: string,
): Promise<Response> {
  const row = env.DB ? await findPublicResult(env.DB, shareId) : null;
  if (!row)
    return new Response('This result is unavailable.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  const result = publicResult(row, url.origin);
  const title = `${result.metrics.download!.toFixed(1)} Mbps down · ${result.metrics.upload!.toFixed(1)} Mbps up | Flexspeed`;
  const description = `My internet speed: ${result.metrics.download!.toFixed(1)} Mbps download, ${result.metrics.upload!.toFixed(1)} Mbps upload and ${result.metrics.latency!.toFixed(1)} ms ping. Test your connection with Flexspeed.`;
  const metadata = `
    <link rel="canonical" href="${escapeHtml(result.shareUrl)}" />
    <meta name="robots" content="noindex,follow" />
    <meta property="og:type" content="website" /><meta property="og:site_name" content="Flexspeed" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(result.shareUrl)}" />
    <meta property="og:image" content="${escapeHtml(result.posterUrl)}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(description)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(result.posterUrl)}" />`;

  // Asset bindings redirect /index.html to /. Fetch its canonical URL without
  // conditional request headers so crawlers always receive a complete document.
  const shell = await env.ASSETS.fetch(new Request(new URL('/', url)));
  const response = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute('content', description);
      },
    })
    .on('head', {
      element(element) {
        element.append(metadata, { html: true });
      },
    })
    .transform(shell);

  return new Response(response.body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function posterRoute({ env, url }: RouteContext, shareId: string): Promise<Response> {
  const row = env.DB ? await findPublicResult(env.DB, shareId) : null;
  if (!row)
    return new Response('Result not found.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  const poster = await ensurePoster(env, row, url.origin);
  return new Response(poster.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300',
      ETag: poster.httpEtag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
