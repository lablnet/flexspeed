import type { Sample } from '../../../shared/types';

export function Plot({
  download,
  upload,
  latency = false,
}: {
  download: Sample[];
  upload: Sample[];
  latency?: boolean;
}) {
  const all = [...download, ...upload];
  const maxX = Math.max(1, ...all.map((point) => point.time));
  const maxY = Math.max(10, ...all.map((point) => point.value)) * 1.15;
  const path = (points: Sample[]) =>
    points
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'}${((point.time / maxX) * 600).toFixed(2)},${(110 - (point.value / maxY) * 100).toFixed(2)}`,
      )
      .join(' ');
  return (
    <div className="plot">
      <div className="plot-scale">
        <span>{Math.ceil(maxY)}</span>
        <span>{Math.ceil(maxY / 2)}</span>
        <span>0</span>
      </div>
      <svg
        viewBox="0 0 600 120"
        preserveAspectRatio="none"
        role="img"
        aria-label={
          all.length
            ? `${latency ? 'Latency' : 'Throughput'} measurement chart`
            : 'Chart will appear during your test'
        }
      >
        {[10, 60, 110].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} className="gridline" />
        ))}
        {download.length > 1 && (
          <path
            d={path(download)}
            className={latency ? 'line latency-line' : 'line download-line'}
          />
        )}
        {upload.length > 1 && <path d={path(upload)} className="line upload-line" />}
      </svg>
      {!all.length && (
        <span className="empty-chart">A little quiet. Start a test to see the details.</span>
      )}
      <div className="plot-time">
        <span>0s</span>
        <span>{Math.ceil(maxX)}s</span>
      </div>
    </div>
  );
}
