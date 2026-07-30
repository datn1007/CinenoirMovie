import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import { Film, Ticket, User } from "lucide-react";

const navItems = [
  { to: ROUTES.STAFF, label: "Bán Vé", icon: Ticket, end: true },
  { to: ROUTES.STAFF_PROFILE, label: "Hồ Sơ", icon: User, end: false },
] as const;

export default function StaffLayout() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-screen flex text-[#e5e2e1] bg-[#1c1a1a]">
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#201f1f] border-r border-[#332220]/40 flex flex-col p-6 space-y-6 z-40">
        <div className="flex items-center gap-3 px-1 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#e50914] flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.45)]">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#ffb4aa] tracking-tighter uppercase">CineNoir</h1>
            <p className="text-[10px] text-[#e9bcb6]/70 leading-none">Nhân Viên</p>
          </div>
        </div>

        <nav className="flex-grow space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#e50914] text-white shadow-[0_4px_12px_rgba(229,9,20,0.3)] translate-x-1"
                    : "text-[#e9bcb6]/85 hover:bg-[#353534] hover:text-[#ffb4aa]"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pt-6 border-t border-[#5e3f3b]/35 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold tracking-wider text-[#ffb4ab] hover:bg-[#93000a]/10 rounded-lg transition-all cursor-pointer uppercase"
          >
            <span>↩</span><span>Đăng Xuất</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2 bg-[#1c1b1b] border border-[#5e3f3b]/25 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-[#e50914] flex items-center justify-center text-white font-bold text-sm shrink-0 select-none">
              {currentUser?.fullName?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-white truncate leading-tight">{currentUser?.fullName}</p>
              <p className="text-[10px] text-[#e9bcb6]/60 truncate uppercase tracking-widest mt-0.5">Nhân viên</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-[240px] p-8 md:p-10 select-text">
        <Outlet />
      </main>
    </div>
  );
}
