import { createContext, useContext, type ReactNode } from 'react';
import { useAuthModel } from './useAuthModel';
export type { BeforeSignOut } from './useSignOutPreparation';

const AuthContext = createContext<ReturnType<typeof useAuthModel> | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={useAuthModel()}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth requires AuthProvider');
  return auth;
}
