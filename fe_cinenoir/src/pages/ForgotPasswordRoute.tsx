import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import ForgotPasswordPage from "../components/ForgotPasswordPage";

export default function ForgotPasswordRoute() {
  const navigate = useNavigate();
  return (
    <ForgotPasswordPage
      onBack={() => navigate(ROUTES.LOGIN)}
      onResetSuccess={() => navigate(ROUTES.LOGIN)}
    />
  );
}
