import { format } from '../../utils/format';

export function SmallMetric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <span>{label}</span>
      <strong>
        {format(value)}
        <small>ms</small>
      </strong>
    </div>
  );
}
