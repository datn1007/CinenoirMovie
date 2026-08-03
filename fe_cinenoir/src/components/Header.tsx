import React, { useState, useEffect, useRef } from "react";
import { AppView } from "../types";
import { Search, ChevronDown, X, ShieldAlert, User } from "lucide-react";

type HomeTab = "home" | "nowShowing" | "comingSoon" | "promotions";

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeHomeTab?: HomeTab;
  onHomeTabChange?: (tab: HomeTab) => void;
  isLoggedIn: boolean;
  userRole?: string;
  isAdmin?: boolean;
  onLogout: () => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
  currentUser?: { fullName?: string; username?: string } | null;
  onViewProfile?: () => void;
  onScrollToSection?: (sectionId: string) => void;
}

export default function Header({
  currentView,
  onNavigate,
  activeHomeTab = "home",
  onHomeTabChange,
  isLoggedIn,
  userRole,
  isAdmin = false,
  onLogout,
  onSearchChange,
  searchTerm = "",
  currentUser,
  onViewProfile,
  onScrollToSection,
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const displayName = currentUser?.fullName || currentUser?.username || "Người dùng";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "U";
  const homeNavItems: Array<{ tab: HomeTab; label: string }> = [
    { tab: "home", label: "Trang Chủ" },
    { tab: "nowShowing", label: "Phim Đang Chiếu" },
    { tab: "comingSoon", label: "Sắp Ra Mắt" },
    { tab: "promotions", label: "Khuyến Mãi" },
  ];
  const homeNavClass = (tab: HomeTab) =>
    `relative transition-colors duration-200 after:absolute after:left-0 after:-bottom-1.5 after:h-0.5 after:bg-[#e50914] after:transition-all ${
      activeHomeTab === tab
        ? "text-white font-semibold after:w-full"
        : "text-[#e5e5e5]/70 hover:text-[#e5e5e5] after:w-0 hover:after:w-full"
    }`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "bg-[#141414]" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-12 py-3">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-6 lg:gap-10">
        <button
          onClick={() => {
            onNavigate("Home");
            onHomeTabChange?.("home");
          }}
          className="text-[#e50914] font-black text-2xl md:text-3xl tracking-tighter select-none shrink-0 hover:opacity-90 transition-opacity"
        >
          CINENOIR
        </button>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          {homeNavItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => {
                onNavigate("Home");
                onHomeTabChange?.(item.tab);
                if (!onHomeTabChange && onScrollToSection && item.tab !== "home" && item.tab !== "promotions") {
                  onScrollToSection(item.tab === "nowShowing" ? "now-showing" : "coming-soon");
                }
              }}
              className={homeNavClass(item.tab)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Search */}
        <div className="flex items-center">
          {showSearch ? (
            <div className="flex items-center gap-2 border border-white/60 bg-black/80 backdrop-blur-sm px-3 py-2 transition-all">
              <Search className="w-4 h-4 text-white shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Tìm kiếm phim, thể loại..."
                className="bg-transparent text-white text-sm outline-none w-40 md:w-52 placeholder:text-white/40"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  onSearchChange?.("");
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>

        {isLoggedIn ? (
          <>
            {isAdmin && (
              <button
                onClick={() => onNavigate("Dashboard")}
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#e50914] border border-[#e50914]/50 px-3 py-1.5 rounded hover:bg-[#e50914]/10 transition-all"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Quản Trị
              </button>
            )}

            {/* Avatar + Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu((p) => !p)}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded bg-[#e50914] flex items-center justify-center text-white font-bold text-sm select-none">
                  {avatarInitial}
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2.5 w-52 bg-[#1f1f1f] border border-white/10 rounded shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                    <p className="text-white text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-white/45 text-xs mt-0.5 truncate">{userRole || "Thành viên"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onViewProfile?.();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white/75 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Xem Hồ Sơ
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate("Dashboard");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white/75 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4 text-[#e50914]" />
                      Trang Quản Trị
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white/75 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => onNavigate("Login")}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors hidden sm:block"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => onNavigate("Register")}
              className="bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
            >
              Đăng ký
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Mobile tab strip — the desktop nav above is hidden below md, so this is the
          only way phone users can reach Sắp Ra Mắt / Khuyến Mãi without it. */}
      {onHomeTabChange && (
        <nav className="flex md:hidden items-center gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {homeNavItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => {
                onNavigate("Home");
                onHomeTabChange(item.tab);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                activeHomeTab === item.tab
                  ? "bg-[#e50914] text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
