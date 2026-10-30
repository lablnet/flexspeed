import { Gamepad2, MonitorPlay, Video } from 'lucide-react';
import { assessQuality } from '../../../shared/quality';
import type { Metrics, Sample } from '../../../shared/types';

const icons = { Streaming: MonitorPlay, Gaming: Gamepad2, 'Video calls': Video };

export function QualityPanel({
  metrics,
  downloadSamples,
  local = false,
}: {
  metrics: Metrics;
  downloadSamples: Sample[];
  local?: boolean;
}) {
  if (local) return null;

  return (
    <section className="quality-section" aria-label="Estimated connection experience">
      <div className="section-heading">
        <h2>How your connection could feel.</h2>
        <span className="small-tag">ESTIMATED EXPERIENCE</span>
      </div>
      <div className="quality-grid">
        {assessQuality(metrics, downloadSamples).map(({ activity, grade, reason }) => {
          const Icon = icons[activity];
          return (
            <article className="panel quality-card" key={activity}>
              <h3>
                <Icon size={18} aria-hidden="true" />
                {activity}
              </h3>
              <strong className={`quality-grade quality-${grade.toLowerCase()}`}>{grade}</strong>
              <p>{reason}</p>
            </article>
          );
        })}
      </div>
      <p className="muted-copy">
        Estimates from this short test to Cloudflare’s edge. Actual apps and servers may perform
        differently. Packet loss is not measured.
      </p>
    </section>
  );
}
