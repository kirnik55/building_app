// frontend/src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthCtx = createContext({ user: null, loading: false, refresh: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadUser() {
    const token = localStorage.getItem("token");
    if (!token) { setUser(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
    } catch {
      // 401 обработается в интерцепторе api.js (очистит токены)
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUser(); }, []);

  const value = useMemo(() => ({ user, loading, refresh: loadUser }), [user, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
