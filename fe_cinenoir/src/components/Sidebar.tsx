import React from "react";
import { NavLink } from "react-router-dom";
import { Staff } from "../types";
import { ROUTES } from "../constants/routes";
import {
  LayoutDashboard,
  Film,
  MonitorPlay,
  TicketPercent,
  LifeBuoy,
  LogOut,
  UserCog,
  Receipt,
  CalendarClock,
  Users,
} from "lucide-react";

interface SidebarProps {
  currentUser: Staff | null;
  onLogout: () => void;
}

const navItems = [
  { to: ROUTES.ADMIN, label: "Tổng Quan", icon: LayoutDashboard, end: true },
  { to: ROUTES.ADMIN_MOVIES, label: "Danh Sách Phim", icon: Film },
  { to: ROUTES.ADMIN_SHOWTIMES, label: "Lịch Chiếu", icon: CalendarClock },
  { to: ROUTES.ADMIN_ROOMS, label: "Phòng Chiếu", icon: MonitorPlay },
  { to: ROUTES.ADMIN_STAFF, label: "Quản Lý Nhân Sự", icon: Users },
  { to: ROUTES.ADMIN_MEMBERS, label: "Quản Lý Người Dùng", icon: UserCog },
  { to: ROUTES.ADMIN_INVOICES, label: "Hóa Đơn", icon: Receipt },
  { to: ROUTES.ADMIN_VOUCHERS, label: "Mã Giảm Giá", icon: TicketPercent },
] as const;

export default function Sidebar({ currentUser, onLogout }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1c1b1b] border-r border-white/[0.06] flex flex-col p-5 space-y-7 z-40">
      {/* Top Brand Header */}
      <div className="flex items-center gap-3 px-2 pt-1">
        <div className="w-10 h-10 rounded-xl bg-[#e50914] flex items-center justify-center shadow-[0_0_18px_rgba(229,9,20,0.4)]">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight font-headline-lg mb-0.5">
            CineNoir
          </h1>
          <p className="text-[10px] text-[#8a7773] leading-none tracking-wide">Quản Lý Rạp Chiếu</p>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-grow space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold text-[#6b5a56] uppercase tracking-widest">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[11.5px] font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#e50914] text-white shadow-[0_4px_14px_rgba(229,9,20,0.35)]"
                    : "text-[#9c8b87] hover:bg-white/[0.05] hover:text-[#f0dedb]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 ${
                      isActive ? "" : "group-hover:translate-x-0.5 group-hover:scale-105"
                    }`}
                  />
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile and Help sections */}
      <div className="pt-5 border-t border-white/[0.06] space-y-3.5">
        <div className="space-y-1">
          {/* Help Portal */}
          <button
            onClick={() => alert("Đang kết nối đến trung tâm hỗ trợ CineNoir...")}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[11.5px] font-semibold tracking-wide text-[#9c8b87] hover:bg-white/[0.05] hover:text-[#f0dedb] rounded-lg transition-all duration-200 cursor-pointer"
          >
            <LifeBuoy className="w-[18px] h-[18px]" />
            <span>Hỗ Trợ</span>
          </button>

          {/* Exit link / Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[11.5px] font-semibold tracking-wide text-[#e2a29b] hover:bg-[#93000a]/15 hover:text-[#ffb4aa] rounded-lg transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Đăng Xuất</span>
          </button>
        </div>

        {/* User identification badge — profile card */}
        {currentUser && (
          <div className="flex items-center gap-3 px-3.5 py-3 bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.07] rounded-xl">
            <div className="relative shrink-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e50914] to-[#93000a] flex items-center justify-center text-white font-bold text-sm select-none">
                  {currentUser.fullName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-[#1c1b1b]" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {currentUser.fullName}
              </p>
              <p className="text-[10px] text-[#8a7773] truncate mt-0.5">
                {currentUser.role}
              </p>
              <p className="text-[9px] text-[#22c55e] font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                Online
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
