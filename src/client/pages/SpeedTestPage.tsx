import { useStore } from 'zustand';
import { measurementStore } from '../engine/state';
import { ArrowDown, ArrowUp, CircleHelp, Radio } from 'lucide-react';
import { PageHeading } from '../components/layout/PageHeading';
import { TrustStrip } from '../components/layout/TrustStrip';
import { TestPanel } from '../components/test/TestPanel';
import { Metric } from '../components/results/Metric';
import { LatencyPanel } from '../components/results/LatencyPanel';
import { NetworkPanel } from '../components/results/NetworkPanel';
import { MeasurementCharts } from '../components/charts/MeasurementCharts';
import { useTestActions } from '../stores/testModel';
import { ResultSharePanel } from '../components/sharing/ResultSharePanel';

export function SpeedTestPage() {
  const state = useStore(measurementStore);
  const { mode, setMode, info, infoError, start, cancel } = useTestActions((model) => model);

  return (
    <>
      <PageHeading
        title={
          <>
            Meet your <span>connection.</span>
          </>
        }
        description="More than a speed. Discover how your internet really performs."
      />
      {info?.local && (
        <div className="notice">
          <Radio size={16} />
          <span>
            Local preview · These results measure this device to your local Worker. Deploy to
            measure your internet connection.
          </span>
        </div>
      )}
      <div className="test-layout">
        <TestPanel
          state={state}
          mode={mode}
          onModeChange={setMode}
          onStart={start}
          onCancel={cancel}
        />
        <div className="results-column">
          <div className="speed-cards">
            <Metric
              label="Download"
              value={state.metrics.download}
              unit="Mbps"
              icon={<ArrowDown size={19} />}
              tone="green"
              active={state.phase === 'download'}
            />
            <Metric
              label="Upload"
              value={state.metrics.upload}
              unit="Mbps"
              icon={<ArrowUp size={19} />}
              tone="purple"
              active={state.phase === 'upload'}
            />
          </div>
          <LatencyPanel metrics={state.metrics} />
          <NetworkPanel info={info} infoError={infoError} />
        </div>
      </div>
      {state.error && (
        <div className="error-message" role="alert">
          <CircleHelp size={18} />
          {state.error}
        </div>
      )}
      <MeasurementCharts state={state} />
      <ResultSharePanel />
      <TrustStrip />
    </>
  );
}
