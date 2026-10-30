import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageHeading } from '../components/layout/PageHeading';

export function LoginPage() {
  const { user, enabled, loading, error, signIn } = useAuth();
  const [params] = useSearchParams();
  if (user) return <Navigate to="/history" replace />;

  return (
    <>
      <PageHeading
        title="Your connection. Your history."
        description="Testing and sharing are always available without an account."
      />
      <section className="panel login-panel">
        <span className="eyebrow">ONE LESS PASSWORD</span>
        <h2>Continue with Google</h2>
        <p>Sync your browser history and access your saved test results on any device.</p>
        <button
          className="start-button"
          disabled={loading || !enabled}
          onClick={() => void signIn()}
        >
          Continue with Google
        </button>
        {!loading && !enabled && (
          <p className="muted-copy">
            Google sign-in has not been configured for this deployment yet. You can still test and
            share results.
          </p>
        )}
        {(error || params.has('error')) && (
          <p className="inline-error" role="alert">
            {error ?? 'Google sign-in was not completed. Please try again.'}
          </p>
        )}
        <p className="muted-copy">
          Google handles identity verification. We do not ask for your Google password or send
          verification emails. Your browser history syncs when you sign in. Signing out keeps your
          latest 20 available results in this browser.
        </p>
        <Link className="text-button" to="/privacy">
          How your data is stored
        </Link>
      </section>
    </>
  );
}
