import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
    } catch (e) {
      // токен невалиден
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { setLoading(false); return; }
    fetchMe();
  }, []);

  async function login(email, password) {
    const { data } = await api.post("/auth/token/", { email, password });
    localStorage.setItem("token", data.access);
    if (data.refresh) localStorage.setItem("refresh", data.refresh);
    await fetchMe();
    return true;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    setUser(null);
  }

  const value = useMemo(() => ({
    user, setUser, loading, login, logout,
    role: user?.role,
    isEngineer: user?.role === "engineer",
    isManager:  user?.role === "manager",
    isLead:     user?.role === "lead",
    isAdmin:    user?.role === "admin",
    canManage: ["manager", "lead", "admin"].includes(user?.role),
    isAuth: !!user
  }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
