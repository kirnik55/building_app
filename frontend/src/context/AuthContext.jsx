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
      const { data } = await api.get("/auth/me/");  // ← дергаем ОДИН раз
      setUser(data);
    } catch {
      // если 401 — токен убирается в интерцепторе api.js
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUser(); }, []); // при монтировании приложения

  // Позволяет внешне повторно подгрузить пользователя (например, после логина)
  const value = useMemo(() => ({ user, loading, refresh: loadUser }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
