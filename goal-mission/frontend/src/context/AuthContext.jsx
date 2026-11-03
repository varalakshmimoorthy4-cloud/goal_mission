import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // Restore the session from a saved token when the app loads.
  useEffect(() => {
    if (!getToken()) return;
    api.auth
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // If any request comes back 401 (expired token), drop the session -> redirect to login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const finishAuth = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => finishAuth(await api.auth.login({ email, password })), [finishAuth]);
  const register = useCallback(async (payload) => finishAuth(await api.auth.register(payload)), [finishAuth]);
  const startDemo = useCallback(async () => finishAuth(await api.auth.demo()), [finishAuth]);

  const logout = useCallback(async () => {
    try {
      if (getToken()) await api.auth.logout();
    } catch {
      /* the token is discarded locally either way */
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, startDemo, logout }),
    [user, loading, login, register, startDemo, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
