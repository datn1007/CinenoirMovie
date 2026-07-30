import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clapperboard,
  DollarSign,
  Clock,
  Ticket,
  Film,
  RefreshCw,
  AlertCircle,
  Armchair,
  Plus,
  CalendarPlus,
  DoorOpen,
  TicketPercent,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import { API_BASE_URL } from "../lib/apiConfig";
import { formatDate as sharedFormatDate } from "../lib/formatDate";
const getToken = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

interface InvoiceRecord {
  id: string;
  bookingDate: string | null;
  movieName: string | null;
  totalMoney: number | null;
  status: number | null;
  seat: string | null;
  scheduleShow?: string | null;
  scheduleShowTime?: string | null;
}

interface AccountRecord {
  accountId: string;
  roleId: number;
  status: number;
}

interface MovieLite {
  title: string;
  imageUrl: string;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
// JS getDay(): 0=Sun,1=Mon,...,6=Sat → index in DAY_LABELS
const JS_DAY_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

const STATUS_STYLES: Record<number, { label: string; className: string }> = {
  0: { label: "Đã Hủy", className: "bg-red-500/10 text-red-300 border border-red-500/25" },
  1: { label: "Chờ TT", className: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/25" },
  2: { label: "Đã TT", className: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25" },
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function formatMoneyShort(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₫`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K ₫`;
  return formatMoney(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return sharedFormatDate(dateStr);
  } catch {
    return dateStr;
  }
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [movieCount, setMovieCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [movies, setMovies] = useState<MovieLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const headers = { Authorization: `Bearer ${getToken()}` };
    try {
      const [invoiceRes, accountRes, movieRes, roomRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/invoices`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/accounts`, { headers }),
        fetch(`${API_BASE_URL}/api/movies`),
        fetch(`${API_BASE_URL}/api/cinema-rooms`, { headers }),
      ]);
      if (invoiceRes.ok) setInvoices(await invoiceRes.json());
      if (accountRes.ok) setAccounts(await accountRes.json());
      if (movieRes.ok) {
        const movieData = await movieRes.json();
        setMovieCount(movieData.length);
        setMovies(movieData);
      }
      if (roomRes.ok) setRoomCount((await roomRes.json()).length);
    } catch {
      setError("Không thể tải dữ liệu. Kiểm tra kết nối backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalMoney ?? 0), 0);
  const memberCount = accounts.filter((a) => a.roleId === 3 && a.status !== 0).length;
  const staffCount = accounts.filter((a) => a.roleId !== 3 && a.status !== 0).length;

  const bookingsByDay = new Array(7).fill(0);
  invoices.forEach((inv) => {
    if (inv.bookingDate) {
      try {
        const d = new Date(inv.bookingDate);
        const idx = JS_DAY_TO_IDX[d.getDay()];
        if (idx !== undefined) bookingsByDay[idx]++;
      } catch { /* ignore */ }
    }
  });
  const maxBookings = Math.max(...bookingsByDay, 1);

  const recentInvoices = [...invoices]
    .sort((a, b) => (b.bookingDate ?? "").localeCompare(a.bookingDate ?? ""))
    .slice(0, 8);

  const movieByTitle = new Map(movies.map((m) => [m.title, m.imageUrl]));

  // Week-over-week comparison, derived from real invoice booking dates already fetched above.
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 14);

  let thisWeekRevenue = 0, lastWeekRevenue = 0, thisWeekTickets = 0, lastWeekTickets = 0;
  invoices.forEach((inv) => {
    if (!inv.bookingDate) return;
    const d = new Date(inv.bookingDate);
    if (Number.isNaN(d.getTime())) return;
    if (d >= startOfThisWeek && d <= now) {
      thisWeekRevenue += inv.totalMoney ?? 0;
      thisWeekTickets++;
    } else if (d >= startOfLastWeek && d < startOfThisWeek) {
      lastWeekRevenue += inv.totalMoney ?? 0;
      lastWeekTickets++;
    }
  });
  const revenueChange = pctChange(thisWeekRevenue, lastWeekRevenue);
  const ticketsChange = pctChange(thisWeekTickets, lastWeekTickets);

  // Today's snapshot for the welcome banner.
  const todayStr = now.toISOString().slice(0, 10);
  const todayInvoices = invoices.filter((inv) => (inv.bookingDate ?? "").slice(0, 10) === todayStr);
  const todayTickets = todayInvoices.length;
  const todayRevenue = todayInvoices.reduce((s, inv) => s + (inv.totalMoney ?? 0), 0);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const firstName = currentUser?.fullName?.trim().split(/\s+/).pop() ?? "Admin";

  const stats = [
    {
      label: "Tổng Doanh Thu",
      value: loading ? "..." : formatMoney(totalRevenue),
      sub: `${invoices.length} hóa đơn`,
      icon: DollarSign,
      accent: "text-[#e9c349]",
      accentBg: "bg-[#e9c349]/12",
      change: loading || invoices.length === 0 ? null : revenueChange,
    },
    {
      label: "Vé Đã Bán",
      value: loading ? "..." : invoices.length.toString(),
      sub: "Tất cả thời gian",
      icon: Ticket,
      accent: "text-[#ff6b61]",
      accentBg: "bg-[#e50914]/12",
      change: loading || invoices.length === 0 ? null : ticketsChange,
    },
    {
      label: "Thành Viên",
      value: loading ? "..." : memberCount.toString(),
      sub: "Tài khoản đang hoạt động",
      icon: Users,
      accent: "text-[#60a5fa]",
      accentBg: "bg-[#3b82f6]/12",
      change: null,
    },
    {
      label: "Phim / Phòng Chiếu",
      value: loading ? "..." : `${movieCount} / ${roomCount}`,
      sub: "Phim đang có / Phòng chiếu",
      icon: Clapperboard,
      accent: "text-[#c084fc]",
      accentBg: "bg-[#a855f7]/12",
      change: null,
    },
  ];

  const quickActions = [
    { label: "Thêm Phim", desc: "Thêm phim mới vào hệ thống", icon: Film, to: ROUTES.ADMIN_MOVIES },
    { label: "Tạo Lịch Chiếu", desc: "Sắp xếp suất chiếu mới", icon: CalendarPlus, to: ROUTES.ADMIN_SHOWTIMES },
    { label: "Thêm Phòng Chiếu", desc: "Cấu hình phòng chiếu mới", icon: DoorOpen, to: ROUTES.ADMIN_ROOMS },
    { label: "Tạo Mã Giảm Giá", desc: "Phát hành ưu đãi mới", icon: TicketPercent, to: ROUTES.ADMIN_VOUCHERS },
  ] as const;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-[#e9bcb6]/70">
        <AlertCircle className="w-10 h-10 text-[#e50914]" />
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 bg-[#e50914]/15 border border-[#e50914]/30 text-[#ffb4aa] rounded-lg text-xs font-bold uppercase hover:bg-[#e50914]/25 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Thử Lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#2a1414] via-[#201f1f] to-[#1c1a1a] p-6 md:p-7"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#e50914]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <h1 className="text-2xl md:text-[26px] font-black text-white tracking-tight font-headline-lg">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-[#c9b3af] mt-1.5">
              Đây là những gì đang diễn ra tại rạp của bạn hôm nay.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] min-w-[110px]">
              <p className="text-[10px] font-bold text-[#af8782] uppercase tracking-widest">Vé Hôm Nay</p>
              <p className="text-xl font-bold text-white mt-0.5">{loading ? "..." : todayTickets}</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07] min-w-[110px]">
              <p className="text-[10px] font-bold text-[#af8782] uppercase tracking-widest">Doanh Thu</p>
              <p className="text-xl font-bold text-white mt-0.5">{loading ? "..." : formatMoneyShort(todayRevenue)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-[#332220]/40 pb-4">
        <div>
          <h2 className="text-[#e5e2e1] text-3xl font-black font-headline-lg tracking-tight">
            Bảng Điều Khiển
          </h2>
          <p className="text-xs text-[#e9bcb6]/75 mt-1.5 leading-none">
            Dữ liệu thực từ hệ thống — cập nhật mỗi lần tải trang.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-xs text-[#ffb4aa] bg-[#2a2a2a] border border-[#ffb4aa]/25 px-3.5 py-2 rounded-lg font-bold hover:bg-[#353534] hover:border-[#ffb4aa]/45 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm Mới
          </button>
          <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2 rounded-full font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span>Trực Tuyến</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          const isUp = (s.change ?? 0) >= 0;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              whileHover={{ y: -3 }}
              className="bg-[#201f1f] border border-[#5e3f3b]/30 rounded-2xl p-5 hover:border-[#5e3f3b]/60 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-5">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${s.accentBg}`}>
                  <Icon className={`w-5 h-5 ${s.accent}`} />
                </div>
                {s.change !== null && (
                  <span
                    className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full ${
                      isUp ? "text-emerald-300 bg-emerald-500/10" : "text-red-300 bg-red-500/10"
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(s.change)}%
                  </span>
                )}
              </div>
              <span className="text-[10px] font-black text-[#af8782] uppercase tracking-widest">
                {s.label}
              </span>
              <div className="flex items-baseline gap-2 flex-wrap mt-1.5">
                <span className="text-2xl font-bold font-headline-lg text-white">{s.value}</span>
              </div>
              <p className="text-[10px] text-[#e9bcb6]/55 font-semibold mt-1">
                {s.change !== null ? "So với tuần trước · " : ""}
                {s.sub}
              </p>
            </motion.div>
          );
        })}
      </section>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Bar chart: bookings by day of week */}
        <section className="lg:col-span-8 bg-[#201f1f] border border-[#5e3f3b]/30 p-6 rounded-2xl relative overflow-hidden group shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffb4aa]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-bold text-lg font-headline-lg text-white mb-1">
                Phân Bổ Đặt Vé Theo Ngày Trong Tuần
              </h3>
              <p className="text-xs text-[#e9bcb6]/65 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#e9c349]" />
                <span>Tổng số vé theo từng thứ (toàn bộ lịch sử)</span>
              </p>
            </div>
            <Film className="w-5 h-5 text-[#ffb4aa]" />
          </div>

          <div className="relative h-56 mt-4 px-2 select-none">
            {/* Cleaner background grid */}
            <div className="absolute inset-0 bottom-[38px] flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-t border-dashed border-white/[0.05] w-full" />
              ))}
            </div>

            <div className="relative h-full flex items-end justify-between gap-4 border-b border-[#5e3f3b]/25 pb-4">
              {DAY_LABELS.map((label, i) => {
                const count = bookingsByDay[i];
                const heightPct = `${(count / maxBookings) * 100}%`;
                return (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center group/bar h-full justify-end"
                  >
                    <div className="w-full flex justify-center h-[85%] items-end">
                      <div className="w-full max-w-[38px] h-full flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: loading ? 0 : heightPct }}
                          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                          className="w-full bg-gradient-to-t from-[#e50914] to-[#ff6b61] rounded-t-lg group-hover/bar:brightness-125 group-hover/bar:shadow-[0_0_16px_rgba(229,9,20,0.5)] transition-all duration-200 relative"
                        >
                          {count > 0 && (
                            <span className="hidden group-hover/bar:flex absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-[#0f0e0e] text-white px-2 py-1 rounded-md border border-white/10 shadow-lg z-10 font-bold whitespace-nowrap items-center">
                              {count} vé
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-[#af8782] font-bold tracking-wide mt-2.5">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 items-center justify-end text-[10px] uppercase font-bold text-[#e1cac7] mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-gradient-to-r from-[#e50914] to-[#ff6b61] rounded-full" />
              <span>Số Vé Đã Bán</span>
            </div>
          </div>
        </section>

        {/* Recent invoices activity */}
        <section className="lg:col-span-4 bg-[#201f1f] border border-[#5e3f3b]/30 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[#5e3f3b]/20 pb-3">
            <h3 className="font-bold text-base text-white">Vé Gần Đây</h3>
            <button
              onClick={() => navigate(ROUTES.ADMIN_INVOICES)}
              className="text-[9px] font-bold text-[#ffb4aa] uppercase tracking-wider hover:underline cursor-pointer"
            >
              Xem Tất Cả
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <p className="text-xs text-[#af8782]/60 text-center py-6">Đang tải...</p>
            ) : recentInvoices.length === 0 ? (
              <p className="text-xs text-[#af8782]/60 text-center py-6">Chưa có hóa đơn nào.</p>
            ) : (
              recentInvoices.map((inv) => {
                const poster = movieByTitle.get(inv.movieName ?? "");
                const statusInfo = STATUS_STYLES[inv.status ?? -1] ?? {
                  label: "Không rõ",
                  className: "bg-white/5 text-[#af8782] border border-white/10",
                };
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-[#5e3f3b]/10 hover:bg-white/[0.05] rounded-xl transition-colors"
                  >
                    {poster ? (
                      <img
                        src={poster}
                        alt={inv.movieName ?? ""}
                        className="w-9 h-12 rounded-md object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-9 h-12 rounded-md shrink-0 flex items-center justify-center bg-[#e50914]/12 text-[#e50914]">
                        <Ticket className="w-4 h-4" />
                      </div>
                    )}
                    <div className="overflow-hidden min-w-0 flex-1">
                      <p className="text-xs text-[#e5e2e1] font-semibold leading-tight truncate">
                        {inv.movieName ?? "Không rõ phim"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] text-[#e9bcb6]/55 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(inv.bookingDate)}
                        </span>
                        {inv.seat && (
                          <span className="text-[10px] text-[#e9bcb6]/55 flex items-center gap-0.5">
                            <Armchair className="w-2.5 h-2.5" />
                            {inv.seat}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] font-bold text-white whitespace-nowrap">
                        {formatMoney(inv.totalMoney ?? 0)}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="h-[1px] bg-[#5e3f3b]/25" />

          <div className="bg-gradient-to-br from-[#e50914]/15 to-transparent border border-[#e50914]/20 p-4 rounded-xl">
            <span className="text-[9px] bg-[#e50914] text-white px-2 py-0.5 rounded font-black uppercase tracking-widest">
              Tổng Quan Nhân Sự
            </span>
            <p className="text-xs text-[#e5e2e1] font-bold mt-2.5 leading-snug">
              {loading
                ? "Đang tải..."
                : `${staffCount} nhân sự đang hoạt động trong hệ thống.`}
            </p>
            <button
              onClick={() => navigate(ROUTES.ADMIN_STAFF)}
              className="text-[#e2aba5] font-black text-xs uppercase hover:underline flex items-center gap-1 mt-3 cursor-pointer"
            >
              <span>Quản Lý Nhân Sự</span>
              <span>→</span>
            </button>
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section>
        <h3 className="font-bold text-base text-white mb-3.5">Thao Tác Nhanh</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.to}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                whileHover={{ y: -3 }}
                onClick={() => navigate(action.to)}
                className="group text-left bg-[#201f1f] border border-[#5e3f3b]/30 hover:border-[#e50914]/50 rounded-2xl p-4 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#e50914]/12 flex items-center justify-center group-hover:bg-[#e50914]/20 transition-colors">
                    <Icon className="w-4 h-4 text-[#ff6b61]" />
                  </div>
                  <Plus className="w-3.5 h-3.5 text-[#af8782] group-hover:text-[#ffb4aa] group-hover:rotate-90 transition-all duration-300" />
                </div>
                <p className="text-xs font-bold text-white">{action.label}</p>
                <p className="text-[10px] text-[#af8782] mt-1 leading-snug">{action.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
