import { ArrowUpRight, Check, LoaderCircle, Radio, RotateCcw, X, Zap } from 'lucide-react';
import type { Mode, TestState } from '../../../shared/types';
import { activePhases, phaseLabels } from '../../constants/test';
import { dataSize } from '../../utils/format';
import { Gauge } from './Gauge';

interface TestPanelProps {
  state: TestState;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onStart: () => void;
  onCancel: () => void;
}

export function TestPanel({ state, mode, onModeChange, onStart, onCancel }: TestPanelProps) {
  const active = activePhases.includes(state.phase);
  const speed = state.phase === 'complete' ? (state.metrics.download ?? 0) : state.liveSpeed;
  return (
    <section className="test-panel panel" aria-label="Speed test">
      <div className="panel-top">
        <span className="section-label">
          <Radio size={15} /> LIVE SPEED TEST
        </span>
        <span className={`test-status ${active ? 'running' : ''}`}>
          <span className="status-dot" />
          {active ? 'Testing' : state.phase === 'complete' ? 'Complete' : 'Standing by'}
        </span>
      </div>
      <Gauge speed={speed} active={active} phase={state.phase} />
      <div className="test-controls">
        <p className="phase-label" role="status">
          {active && <LoaderCircle size={14} className="spin" />}
          {phaseLabels[state.phase]}
        </p>
        <button
          className={`start-button ${active ? 'cancel-button' : ''}`}
          onClick={active ? () => onCancel() : onStart}
        >
          {active ? (
            <>
              <X size={17} /> Cancel test
            </>
          ) : state.phase === 'complete' ? (
            <>
              <RotateCcw size={17} /> Test again
            </>
          ) : (
            <>
              <Zap size={18} fill="currentColor" /> Start speed test <ArrowUpRight size={17} />
            </>
          )}
        </button>
        <div className="mode-switch" role="group" aria-label="Test mode">
          <button
            disabled={active}
            aria-pressed={mode === 'standard'}
            className={mode === 'standard' ? 'selected' : ''}
            onClick={() => onModeChange('standard')}
          >
            Standard
          </button>
          <button
            disabled={active}
            aria-pressed={mode === 'lite'}
            className={mode === 'lite' ? 'selected' : ''}
            onClick={() => onModeChange('lite')}
          >
            Data saver <span>↓ 90%</span>
          </button>
        </div>
        <p className="data-note">
          {active || state.phase === 'complete' || state.phase === 'cancelled'
            ? `${dataSize(state.bytes)} estimated data used`
            : mode === 'lite'
              ? 'About 12 seconds · Up to 81 MB'
              : 'About 20 seconds · Up to 801 MB'}
        </p>
      </div>
      <div
        className="test-progress"
        aria-label="Test progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(state.progress)}
      >
        <span style={{ width: `${state.progress}%` }} />
      </div>
      <div className="test-steps">
        {['Connect', 'Latency', 'Download', 'Upload'].map((step, i) => (
          <span key={step} className={state.progress >= [2, 5, 20, 60][i] ? 'step-active' : ''}>
            {state.progress >= [5, 20, 60, 100][i] ? (
              <Check size={12} />
            ) : (
              <span className="step-number">{i + 1}</span>
            )}
            {step}
          </span>
        ))}
      </div>
    </section>
  );
}
