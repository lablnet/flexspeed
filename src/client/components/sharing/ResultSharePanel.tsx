import { useStore } from 'zustand';
import { measurementStore } from '../../engine/state';
import { LoaderCircle } from 'lucide-react';
import { useTestActions } from '../../stores/testModel';
import { ShareActions } from './ShareActions';

export function ResultSharePanel() {
  const state = useStore(measurementStore);
  const { cloudSave, retrySave } = useTestActions((model) => model);
  if (state.phase !== 'complete') return null;

  return (
    <section className="panel result-share-panel" aria-live="polite">
      <div className="section-heading">
        <h2>Good connections are worth sharing.</h2>
        <span className="small-tag">YOUR RESULT</span>
      </div>
      {cloudSave.status === 'saving' && (
        <p className="saving-message">
          <LoaderCircle size={15} className="spin" /> Saving your result and preparing its social
          preview…
        </p>
      )}
      {cloudSave.status === 'error' && (
        <div>
          <p className="inline-error">
            Your test finished, but cloud saving failed: {cloudSave.error}
          </p>
          <button className="secondary-button" onClick={retrySave}>
            Retry cloud save
          </button>
        </div>
      )}
      {cloudSave.result && (
        <>
          <p className="muted-copy">
            Your link includes a social preview with download, upload, ping and jitter. Your IP
            address is not included.
          </p>
          <ShareActions url={cloudSave.result.shareUrl} posterUrl={cloudSave.result.posterUrl} />
        </>
      )}
    </section>
  );
}
