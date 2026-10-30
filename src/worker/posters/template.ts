import type { PublicResult } from '../../shared/results';

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

const number = (value: number | null) => (value === null ? '—' : value.toFixed(1));

/** Deterministic 1200×630 poster. Only the public result projection enters it. */
export function posterSvg(result: PublicResult): string {
  const m = result.metrics;
  const network = escapeHtml((result.network ?? 'Your internet connection').slice(0, 60));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#15251d"/><stop offset="1" stop-color="#101713"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="1110" cy="40" r="280" fill="#b4ef69" opacity=".04"/>
    <circle cx="1110" cy="40" r="200" fill="none" stroke="#b4ef69" opacity=".12"/>
    <g font-family="Inter" fill="#f3f6ee">
      <rect x="56" y="46" width="48" height="48" rx="13" fill="#b4ef69"/>
      <path d="M83 53 67 74h12l-3 15 18-23H82z" fill="#17231a"/>
      <text x="119" y="82" font-size="35" font-weight="700">flexspeed<tspan fill="#b4ef69">.</tspan></text>
      <text x="56" y="143" font-size="17" letter-spacing="3" fill="#b5c3b3">MEET MY CONNECTION</text>
      <rect x="56" y="175" width="532" height="215" rx="22" fill="#ffffff" opacity=".05"/>
      <rect x="612" y="175" width="532" height="215" rx="22" fill="#ffffff" opacity=".05"/>
      <text x="86" y="222" font-size="19" fill="#b4ef69">↓ DOWNLOAD</text>
      <text x="642" y="222" font-size="19" fill="#c9b9f5">↑ UPLOAD</text>
      <text x="86" y="325" font-size="82" font-weight="700">${number(m.download)}</text>
      <text x="642" y="325" font-size="82" font-weight="700">${number(m.upload)}</text>
      <text x="88" y="362" font-size="18" fill="#a8b6a5">Mbps</text>
      <text x="644" y="362" font-size="18" fill="#a8b6a5">Mbps</text>
      <text x="60" y="445" font-size="17" fill="#a8b6a5">PING</text>
      <text x="285" y="445" font-size="17" fill="#a8b6a5">JITTER</text>
      <text x="60" y="494" font-size="34" font-weight="600">${number(m.latency)} ms</text>
      <text x="285" y="494" font-size="34" font-weight="600">${number(m.jitter)} ms</text>
      <text x="610" y="448" font-size="21">${network}</text>
      <text x="610" y="485" font-size="17" fill="#a8b6a5">${escapeHtml(result.server ?? 'Cloudflare edge')} · ${result.mode === 'lite' ? 'Data saver' : 'Standard'} test</text>
      <path d="M56 535H1144" stroke="#334332"/>
      <text x="56" y="583" font-size="17" fill="#a8b6a5">A clearer view of your internet.</text>
      <text x="1144" y="583" text-anchor="end" font-size="17" fill="#b4ef69">Test yours. Share your speed.</text>
    </g>
  </svg>`;
}
