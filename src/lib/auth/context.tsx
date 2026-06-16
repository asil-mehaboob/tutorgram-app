import { createContext, useContext, useEffect, useState } from 'react';
import { clearSession, getSession, getUser, saveSession, saveUser } from './storage';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser; sessionToken: string };

type AuthContextValue = {
  state: AuthState;
  login: (sessionToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      const token = await getSession();
      const user = await getUser<AuthUser>();
      if (token && user) {
        setState({ status: 'authenticated', user, sessionToken: token });
      } else {
        setState({ status: 'unauthenticated' });
      }
    })();
  }, []);

  async function login(sessionToken: string, user: AuthUser) {
    await saveSession(sessionToken);
    await saveUser(user);
    setState({ status: 'authenticated', user, sessionToken });
  }

  async function logout() {
    await clearSession();
    setState({ status: 'unauthenticated' });
  }

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
