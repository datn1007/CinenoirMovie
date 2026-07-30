import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import AuthScreen from "../components/AuthScreen";
import { Staff } from "../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, isAdmin, isStaff } = useAuth();

  // Already logged in → redirect
  useEffect(() => {
    if (currentUser) {
      if (isAdmin) navigate(ROUTES.ADMIN, { replace: true });
      else if (isStaff) navigate(ROUTES.STAFF, { replace: true });
      else navigate(ROUTES.HOME, { replace: true });
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: Staff) => {
    login(user);
    const roleId = user.roleId ?? 0;
    if (roleId === 1) {
      navigate(ROUTES.ADMIN, { replace: true });
    } else if (roleId === 2) {
      navigate(ROUTES.STAFF, { replace: true });
    } else {
      const pendingMovieId = (location.state as any)?.pendingMovieId;
      if (pendingMovieId) {
        navigate(`${ROUTES.BOOKING}?movieId=${pendingMovieId}`, { replace: true });
      } else {
        navigate(ROUTES.HOME, { replace: true });
      }
    }
  };

  return (
    <AuthScreen
      mode="login"
      onLoginSuccess={handleLoginSuccess}
      onSwitchMode={(nextMode) => {
        if (nextMode === "register") navigate(ROUTES.REGISTER);
        if (nextMode === "forgot-password") navigate(ROUTES.FORGOT_PASSWORD);
      }}
      onBack={() => navigate(ROUTES.HOME)}
    />
  );
}
