import { History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageHeading } from '../components/layout/PageHeading';
import { HistoryTable } from '../components/history/HistoryTable';
import { useTestActions } from '../stores/testModel';

export function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    history,
    clearHistory,
    cloudHistory: cloud,
    syncing,
    syncError,
    retrySync,
  } = useTestActions((model) => model);
  const results = user ? cloud.results : history;

  return (
    <>
      <PageHeading
        title="A little connection history."
        description={
          user
            ? 'Your saved tests, available across devices.'
            : 'Your latest 20 tests in this browser.'
        }
      />
      {!user && (
        <div className="notice">
          <span>
            <Link to="/login">Sign in with Google</Link> to sync your browser history and access
            your saved tests across devices.
          </span>
        </div>
      )}
      <section className="panel history-panel">
        <div className="section-heading">
          <h2>{user ? 'Account history' : 'Browser history'}</h2>
          {user ? (
            <button className="text-button" onClick={cloud.refresh} disabled={cloud.loading}>
              Refresh
            </button>
          ) : (
            history.length > 0 && (
              <button className="text-button" onClick={clearHistory}>
                Clear browser history
              </button>
            )
          )}
        </div>
        {cloud.error && (
          <p className="inline-error" role="alert">
            {cloud.error}
          </p>
        )}
        {syncError && (
          <p className="inline-error" role="alert">
            {syncError}{' '}
            <button className="text-button" onClick={retrySync}>
              Retry sync
            </button>
          </p>
        )}
        {(authLoading || cloud.loading || syncing) && (
          <p className="muted-copy" role="status">
            {syncing ? 'Syncing browser history…' : 'Loading history…'}
          </p>
        )}
        {!results.length && !cloud.loading && !authLoading && !syncing && (
          <div className="history-empty">
            <History size={35} />
            <h3>A fresh start.</h3>
            <p>Your completed tests will appear here.</p>
            <Link className="start-button" to="/">
              Take a speed test
            </Link>
          </div>
        )}
        {results.length > 0 && (
          <HistoryTable
            results={results}
            onDelete={user ? (id) => void cloud.remove(id) : undefined}
          />
        )}
        {user && cloud.cursor && (
          <button
            className="secondary-button load-more"
            onClick={cloud.loadMore}
            disabled={cloud.loading}
          >
            Load older tests
          </button>
        )}
      </section>
    </>
  );
}
