import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import { CinemaRoom } from "../types";
import { API_BASE_URL } from "../lib/apiConfig";

import Sidebar from "../components/Sidebar";

// Shared with leaf routes (e.g. AdminRoomsPage) via useOutletContext — keeps
// RoomManagement itself decoupled from routing (props in, not context-coupled).
export interface AdminOutletContext {
  cinemaRooms: CinemaRoom[];
  reloadCinemaRooms: () => void;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [cinemaRooms, setCinemaRooms] = useState<CinemaRoom[]>([]);

  const reloadCinemaRooms = () => {
    fetch(`${API_BASE_URL}/api/cinema-rooms`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: CinemaRoom[]) => setCinemaRooms(data))
      .catch(() => {});
  };

  useEffect(() => {
    reloadCinemaRooms();
  }, []);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  const context: AdminOutletContext = { cinemaRooms, reloadCinemaRooms };

  return (
    <div className="min-h-screen flex text-[#e5e2e1] bg-[#1c1a1a]">
      <Sidebar currentUser={currentUser} onLogout={handleLogout} />
      <main className="flex-1 ml-[280px] p-8 md:p-10 select-text">
        <Outlet context={context} />
      </main>
    </div>
  );
}
