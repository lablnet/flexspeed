import { useCallback, useRef } from 'react';

/** Prepare while authenticated, then return a commit function to run after logout succeeds. */
export type BeforeSignOut = () => Promise<() => void>;

/** Connect history preparation to logout without making auth depend on history storage. */
export function useSignOutPreparation() {
  const beforeSignOut = useRef<BeforeSignOut | null>(null);

  const registerBeforeSignOut = useCallback((handler: BeforeSignOut) => {
    beforeSignOut.current = handler;

    // An old effect's cleanup must not remove a newer registration.
    return () => {
      if (beforeSignOut.current === handler) beforeSignOut.current = null;
    };
  }, []);

  return { beforeSignOut, registerBeforeSignOut };
}
