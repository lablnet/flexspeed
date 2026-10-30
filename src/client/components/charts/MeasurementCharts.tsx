import type { TestState } from '../../../shared/types';
import { Plot } from './Plot';

export function MeasurementCharts({ state }: { state: TestState }) {
  return (
    <div className="charts-layout">
      <section className="panel chart-panel">
        <div className="section-heading">
          <h2>Connection in motion</h2>
          <div className="legend">
            <span>
              <i className="green-key" />
              Download
            </span>
            <span>
              <i className="purple-key" />
              Upload
            </span>
            <span className="chart-unit">Mbps</span>
          </div>
        </div>
        <Plot download={state.downloadSamples} upload={state.uploadSamples} />
      </section>
      <section className="panel chart-panel">
        <div className="section-heading">
          <h2>The responsiveness picture</h2>
          <span className="chart-unit">ms</span>
        </div>
        <Plot download={state.latencySamples} upload={[]} latency />
      </section>
    </div>
  );
}
