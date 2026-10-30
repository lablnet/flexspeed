import { ArrowDown, ArrowUp } from 'lucide-react';
import { format } from '../../utils/format';

export function Gauge({ speed, active, phase }: { speed: number; active: boolean; phase: string }) {
  const progress = Math.min(1, Math.log10(1 + speed) / Math.log10(1001));
  return (
    <div className="gauge">
      <svg viewBox="0 0 360 230" aria-hidden="true">
        <defs>
          <linearGradient id="speedGradient">
            <stop stopColor="#b1ee48" />
            <stop offset="1" stopColor="#6bb62b" />
          </linearGradient>
        </defs>
        <path className="gauge-track" d="M 45 190 A 155 155 0 1 1 315 190" pathLength="100" />
        <path
          className={`gauge-fill ${active ? 'is-active' : ''}`}
          d="M 45 190 A 155 155 0 1 1 315 190"
          pathLength="100"
          strokeDasharray={`${progress * 100} 100`}
        />
        <text x="32" y="218">
          0
        </text>
        <text x="48" y="96">
          10
        </text>
        <text x="164" y="20">
          100
        </text>
        <text x="291" y="96">
          500
        </text>
        <text x="302" y="218">
          1G
        </text>
      </svg>
      <div className="gauge-reading">
        <span className="gauge-direction">
          {phase === 'upload' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}{' '}
          {phase === 'upload' ? 'UPLOAD' : 'DOWNLOAD'}
        </span>
        <strong>
          {active && ['download', 'upload'].includes(phase)
            ? format(speed)
            : phase === 'complete'
              ? format(speed)
              : '—'}
        </strong>
        <span className="unit">Mbps</span>
      </div>
    </div>
  );
}
