import { QualityPanel } from '../components/results/QualityPanel';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { PublicResult } from '../../shared/results';
import { getPublicResult } from '../api/results';
import { PageHeading } from '../components/layout/PageHeading';
import { Metric } from '../components/results/Metric';
import { LatencyPanel } from '../components/results/LatencyPanel';
import { MeasurementCharts } from '../components/charts/MeasurementCharts';
import { ShareActions } from '../components/sharing/ShareActions';
import { initialState } from '../engine/state';

export function SharedResultPage() {
  const { id } = useParams();
  const [result, setResult] = useState<PublicResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result)
      document.title = `${result.metrics.download?.toFixed(1)} Mbps down · ${result.metrics.upload?.toFixed(1)} Mbps up | Flexspeed`;
  }, [result]);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(null);
    if (id)
      void getPublicResult(id, controller.signal)
        .then(setResult)
        .catch((cause) => {
          if (!controller.signal.aborted)
            setError(cause instanceof Error ? cause.message : 'Result unavailable.');
        });
    return () => controller.abort();
  }, [id]);

  return (
    <>
      <PageHeading
        title="A connection worth sharing."
        description={
          result
            ? `Tested ${new Date(result.date).toLocaleString()} · ${result.network ?? 'Internet connection'} · ${result.mode === 'lite' ? 'Data saver' : 'Standard'} mode`
            : 'A snapshot of one internet connection.'
        }
      />
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {!result && !error && <p role="status">Loading result…</p>}
      {result && (
        <>
          <div className="shared-metrics">
            <div className="speed-cards">
              <Metric
                label="Download"
                value={result.metrics.download}
                unit="Mbps"
                icon={<ArrowDown size={19} />}
                tone="green"
                active={false}
              />
              <Metric
                label="Upload"
                value={result.metrics.upload}
                unit="Mbps"
                icon={<ArrowUp size={19} />}
                tone="purple"
                active={false}
              />
            </div>
            <LatencyPanel metrics={result.metrics} />
          </div>
          <QualityPanel metrics={result.metrics} downloadSamples={result.samples.download} />
          <MeasurementCharts
            state={{
              ...initialState(),
              metrics: result.metrics,
              downloadSamples: result.samples.download,
              uploadSamples: result.samples.upload,
              latencySamples: result.samples.latency,
            }}
          />
          <section className="panel result-share-panel">
            <h2>Send a little connection update.</h2>
            <ShareActions url={result.shareUrl} posterUrl={result.posterUrl} />
            <img
              className="poster-preview"
              src={result.posterUrl}
              alt={`Speed test poster: ${result.metrics.download?.toFixed(1)} Mbps download, ${result.metrics.upload?.toFixed(1)} Mbps upload, ${result.metrics.latency?.toFixed(1)} ms ping`}
              width="1200"
              height="630"
              loading="lazy"
            />
          </section>
          <p className="muted-copy">
            Connected server: {result.server ?? 'Unavailable'} · Method v{result.methodVersion}.
            These are browser-reported HTTP measurements. Public results do not include IP addresses
            or account details.
          </p>
        </>
      )}
      <div className="share-cta">
        <Link to="/" className="start-button">
          Test your own connection
        </Link>
      </div>
    </>
  );
}
