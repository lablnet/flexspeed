import type { Metrics } from '../../../shared/types';
import { SmallMetric } from './SmallMetric';

export function LatencyPanel({ metrics: m }: { metrics: Metrics }) {
  return (
    <section className="panel latency-panel">
      <div className="section-heading">
        <h2>Every millisecond matters</h2>
        <span className="small-tag">LATENCY</span>
      </div>
      <div className="latency-metrics">
        <SmallMetric label="Idle latency" value={m.latency} />
        <SmallMetric label="Jitter" value={m.jitter} />
        <SmallMetric label="Download loaded" value={m.downloadLatency} />
        <SmallMetric label="Upload loaded" value={m.uploadLatency} />
      </div>
      <p className="card-caption">
        <span className="status-dot" /> Lower and steadier is better.
      </p>
    </section>
  );
}
