import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants/routes";
import UserProfile from "../../components/UserProfile";

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const { currentUser, updateUser } = useAuth();

  if (!currentUser) return null;

  return (
    <UserProfile
      currentUser={currentUser}
      onBack={() => navigate(ROUTES.HOME)}
      onUserUpdate={(updated) => updateUser(updated)}
      hideBookingHistory
    />
  );
}
