import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function AccountMenu() {
  const { user, loading, signOut, signingOut, error } = useAuth();
  return (
    <div className="account-menu">
      {user ? (
        <>
          <span className="account-name" title={user.email}>
            {user.name}
          </span>
          <button className="text-button" onClick={() => void signOut()} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          {error && (
            <span className="inline-error" role="alert">
              {error}
            </span>
          )}
        </>
      ) : (
        <Link className="secondary-button" to="/login" aria-disabled={loading}>
          Sign in
        </Link>
      )}
    </div>
  );
}
