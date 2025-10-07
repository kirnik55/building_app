import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) return null; // можно сделать спиннер
  return isAuth ? children : <Navigate to="/login" replace />;
}
