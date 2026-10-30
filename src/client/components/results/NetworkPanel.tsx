import { useState } from 'react';
import { Wifi } from 'lucide-react';
import type { NetworkInfo } from '../../../shared/types';

export function NetworkPanel({
  info,
  infoError,
}: {
  info: NetworkInfo | null;
  infoError: boolean;
}) {
  const [showIp, setShowIp] = useState(false);
  return (
    <section className="panel network-panel">
      <div className="section-heading">
        <h2>
          <Wifi size={17} /> Your connection
        </h2>
        <span className="small-tag">{info?.local ? 'LOCAL' : 'NETWORK'}</span>
      </div>
      <dl>
        <div>
          <dt>Network provider</dt>
          <dd>
            {info?.network ??
              (infoError ? 'Unavailable' : info?.local ? 'Local development' : 'Detecting…')}
            {info?.asn && <span className="asn">AS{info.asn}</span>}
          </dd>
        </div>
        <div>
          <dt>Public IP</dt>
          <dd>
            <button
              className="ip-button"
              disabled={!info?.ip}
              onClick={() => setShowIp(!showIp)}
              title="Toggle IP visibility"
            >
              {info?.ip ? (showIp ? info.ip : '•••.•••.•••.•••') : 'Unavailable locally'}
            </button>
          </dd>
        </div>
        <div>
          <dt>Approx. location</dt>
          <dd>{[info?.city, info?.country].filter(Boolean).join(', ') || 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Connected server</dt>
          <dd>
            <span className="server-dot" />
            {info?.colo ? `${info.colo} · Cloudflare edge` : 'Local Worker'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
