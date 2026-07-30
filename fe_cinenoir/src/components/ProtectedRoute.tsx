import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: "admin" | "staff" | "any";
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { currentUser, isAdmin, isStaff } = useAuth();

  if (!currentUser) return <Navigate to={ROUTES.LOGIN} replace />;

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to={isStaff ? ROUTES.STAFF : ROUTES.HOME} replace />;
  }

  if (requiredRole === "staff" && !isStaff && !isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
}
