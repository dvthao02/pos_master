import { Navigate, Outlet } from "react-router-dom";
import type { LoginZone } from "../lib/api";
import { useAuthStore } from "../store/authStore";

type ProtectedRouteProps = {
  allowedZone: LoginZone;
  allowedRoles?: string[];
  loginPath?: string;
};

export function ProtectedRoute({ allowedZone, allowedRoles, loginPath = "/login" }: ProtectedRouteProps) {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Navigate to={loginPath} replace />;
  }

  if (session.loginZone !== allowedZone) {
    return <Navigate to="/forbidden" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAnyRole = session.roles.some((role) => allowedRoles.includes(role));
    if (!hasAnyRole) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <Outlet />;
}
