import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import AuthScreen from "../components/AuthScreen";
import { Staff } from "../types";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) navigate(ROUTES.HOME, { replace: true });
  }, [currentUser]);

  const handleLoginSuccess = (user: Staff) => {
    login(user);
    navigate(ROUTES.HOME, { replace: true });
  };

  return (
    <AuthScreen
      mode="register"
      onLoginSuccess={handleLoginSuccess}
      onSwitchMode={(nextMode) => {
        if (nextMode === "login") navigate(ROUTES.LOGIN);
        if (nextMode === "forgot-password") navigate(ROUTES.FORGOT_PASSWORD);
      }}
      onBack={() => navigate(ROUTES.HOME)}
    />
  );
}
