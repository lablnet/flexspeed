import { useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from './client';
import { useSignOutPreparation } from './useSignOutPreparation';
import { requestJson } from '../api/request';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export function useAuthModel() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { beforeSignOut, registerBeforeSignOut } = useSignOutPreparation();
  const signOutInFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const config = await requestJson<{ google: boolean }>('auth/config', {
          signal: controller.signal,
        });
        setEnabled(config.google);
        if (!config.google) return;

        const session = await requestJson<{ user?: AuthUser } | null>('auth/get-session', {
          signal: controller.signal,
        });
        setUser(session?.user ?? null);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Sign-in is unavailable.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/history',
        errorCallbackURL: '/login?error=oauth',
      });
      if (result.error) throw new Error(result.error.message ?? 'Google sign-in failed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in failed.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (signOutInFlight.current) return;
    signOutInFlight.current = true;
    setSigningOut(true);
    setError(null);
    try {
      // Fetch the non-deleted account snapshot while the cookie is still valid.
      // Only copy it to browser history after Google-session logout succeeds.
      const commitHistory = await beforeSignOut.current?.();
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Sign-out failed.');
      commitHistory?.();
      setUser(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not prepare history for sign-out. Please retry.',
      );
    } finally {
      signOutInFlight.current = false;
      setSigningOut(false);
    }
  }, []);

  return { user, enabled, loading, error, signIn, signOut, signingOut, registerBeforeSignOut };
}
