import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";

import Header from "../components/Header";
import UserProfile from "../components/UserProfile";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, isAdmin, logout, updateUser } = useAuth();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#141414] text-[#e5e2e1] font-sans antialiased">
      <Header
        currentView="Profile"
        onNavigate={(view) => {
          if (view === "Home") navigate(ROUTES.HOME);
          else if (view === "Login") navigate(ROUTES.LOGIN);
          else if (view === "Register") navigate(ROUTES.REGISTER);
          else if (view === "Dashboard") navigate(ROUTES.ADMIN);
        }}
        isLoggedIn
        isAdmin={isAdmin}
        onLogout={handleLogout}
        currentUser={currentUser}
        onViewProfile={() => {}}
      />
      <UserProfile
        currentUser={currentUser}
        onBack={() => navigate(ROUTES.HOME)}
        onUserUpdate={(updated) => updateUser(updated)}
      />
    </div>
  );
}
