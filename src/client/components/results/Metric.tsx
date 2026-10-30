import type { ReactNode } from 'react';
import { format } from '../../utils/format';

export function Metric({
  label,
  value,
  unit,
  icon,
  tone,
  active,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: ReactNode;
  tone: string;
  active: boolean;
}) {
  return (
    <section className={`panel speed-card ${tone}`}>
      <div className="metric-title">
        <span className="metric-icon">{icon}</span>
        <h2>{label}</h2>
        {active && <span className="live-label">LIVE</span>}
      </div>
      <div className="metric-value">
        {format(value)}
        <span>{unit}</span>
      </div>
      <p>{label === 'Download' ? 'Bring the world to you.' : 'Send something out there.'}</p>
    </section>
  );
}
