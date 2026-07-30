import React, { useState, useEffect, useCallback } from "react";
import { Staff } from "../types";
import {
  ChevronLeft, Save, User, Mail, Phone, MapPin, Calendar, Users, IdCard,
  CheckCircle, AlertCircle, Ticket, XCircle, Loader2, RefreshCw, Clock3, QrCode,
} from "lucide-react";

interface AccountDTO {
  accountId: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  status: number;
  roleId: number;
  roleName: string;
}

interface BookingRecord {
  invoiceId: string;
  bookingDate: string | null;
  movieName: string;
  showDate: string | null;
  showTime: string | null;
  seats: string;
  usedScore: number | null;
  totalMoney: number;
  status: number | null;
  accountId: string | null;
  fullName: string | null;
  checkinStatus: number | null;
  checkinTime: string | null;
  ticketMode?: string | null;
}

interface UserProfileProps {
  currentUser: Staff;
  onBack: () => void;
  onUserUpdate: (updated: Staff) => void;
  hideBookingHistory?: boolean;
}

import { API_BASE_URL } from "../lib/apiConfig";
import { formatDate as sharedFormatDate } from "../lib/formatDate";
import { isBlank, isNameLike, isNotFutureDate, isValidEmail, isValidVietnamesePhone } from "../lib/validation";

const inputCls =
  "w-full bg-[#2a2929] border border-[#5e3f3b]/40 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#e50914]/60 focus:bg-[#2e2e2e] transition-all";

const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-[#e9bcb6]/60 mb-1.5";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => sharedFormatDate(value);

export default function UserProfile({ currentUser, onBack, onUserUpdate, hideBookingHistory }: UserProfileProps) {
  const [account, setAccount] = useState<AccountDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile");

  const [bookingHistory, setBookingHistory] = useState<BookingRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    address: "",
  });

  const jwt = localStorage.getItem("cinenoir_jwt_token") ?? "";

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!jwt || !currentUser.accountId) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/admin/accounts/${encodeURIComponent(currentUser.accountId)}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AccountDTO>;
      })
      .then((found) => {
        setAccount(found);
        setForm({
          fullName: found.fullName ?? "",
          email: found.email ?? "",
          phone: found.phone ?? "",
          gender: found.gender ?? "",
          dateOfBirth: found.dateOfBirth ?? "",
          address: found.address ?? "",
        });
      })
      .catch(() => {
        setForm({
          fullName: currentUser.fullName ?? "",
          email: currentUser.email ?? "",
          phone: currentUser.phone ?? "",
          gender: currentUser.gender ?? "",
          dateOfBirth: currentUser.birthDate ?? "",
          address: currentUser.residentialAddress ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [currentUser.accountId]);

  const fetchBookingHistory = useCallback(async () => {
    const acId = account?.accountId ?? currentUser.accountId;
    if (!acId || !jwt) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/bookings/search?accountId=${encodeURIComponent(acId)}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BookingRecord[] = await res.json();
      setBookingHistory(data);
    } catch (err) {
      console.error("Không thể tải lịch sử đặt vé:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [account?.accountId, currentUser.accountId, jwt]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchBookingHistory();
    }
  }, [activeTab, fetchBookingHistory]);

  const handleCancelBooking = async (invoiceId: string) => {
    if (!jwt) return;
    setCancellingId(invoiceId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices/${encodeURIComponent(invoiceId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      showToast("success", "Hủy vé thành công!");
      setCancelConfirmId(null);
      await fetchBookingHistory();
    } catch (err: any) {
      showToast("error", err.message ?? "Hủy vé thất bại. Vui lòng thử lại.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!account && !currentUser.accountId) {
      showToast("error", "Không tìm thấy tài khoản để cập nhật.");
      return;
    }
    if (isBlank(form.fullName) || !isNameLike(form.fullName)) {
      showToast("error", "Họ và tên không hợp lệ (chỉ được chứa chữ cái và khoảng trắng).");
      return;
    }
    if (!isValidEmail(form.email)) {
      showToast("error", "Email không hợp lệ.");
      return;
    }
    if (!isValidVietnamesePhone(form.phone)) {
      showToast("error", "Số điện thoại không hợp lệ (định dạng Việt Nam, ví dụ 0912345678).");
      return;
    }
    if (!isNotFutureDate(form.dateOfBirth)) {
      showToast("error", "Ngày sinh không được lớn hơn ngày hiện tại.");
      return;
    }

    const accountId = account?.accountId ?? currentUser.accountId;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts/${accountId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          status: account?.status ?? 1,
          roleId: account?.roleId ?? currentUser.roleId ?? 3,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const updated: AccountDTO = await res.json();
      setAccount(updated);
      const updatedUser: Staff = {
        ...currentUser,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        gender: updated.gender,
        birthDate: updated.dateOfBirth,
        residentialAddress: updated.address,
        accountId: updated.accountId,
      };
      onUserUpdate(updatedUser);
      showToast("success", "Cập nhật thông tin thành công!");
    } catch (err: any) {
      showToast("error", err.message ?? "Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = form.fullName || currentUser.fullName || currentUser.username || "Người dùng";
  const avatarInitial = displayName[0]?.toUpperCase() ?? "U";
  const accountId = account?.accountId ?? currentUser.accountId ?? "—";
  const roleName = account?.roleName ?? currentUser.role ?? "Thành viên";

  return (
    <div className="min-h-screen bg-[#141414] text-[#e5e2e1] pt-20 pb-16">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold transition-all animate-fade-in ${
            toast.type === "success"
              ? "bg-[#1a2e1a] border-green-700/50 text-green-300"
              : "bg-[#2e1a1a] border-red-700/50 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 md:px-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-semibold mb-6 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại trang chủ
        </button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Hồ Sơ Của Bạn</h1>
          <p className="text-sm text-white/45 mt-1">Quản lý thông tin cá nhân và lịch sử đặt vé.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-[#e50914]/40 border-t-[#e50914] rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Đang tải thông tin...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile header card */}
            <div className="bg-[#1c1b1b] border border-[#5e3f3b]/30 rounded-2xl p-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-[#e50914] flex items-center justify-center text-white font-black text-3xl shrink-0 shadow-[0_0_24px_rgba(229,9,20,0.35)] select-none">
                {avatarInitial}
              </div>
              <div className="overflow-hidden">
                <h2 className="text-2xl font-black text-white truncate">{displayName}</h2>
                <p className="text-sm text-white/50 mt-0.5">
                  @{currentUser.username} · {roleName}
                </p>
                <p className="text-xs text-[#e9bcb6]/40 mt-1 font-mono">{accountId}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[#5e3f3b]/30">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wide transition-colors -mb-px border-b-2 ${
                  activeTab === "profile"
                    ? "text-white border-[#e50914]"
                    : "text-white/50 border-transparent hover:text-white hover:border-white/20"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Thông Tin Cá Nhân
              </button>
              {!hideBookingHistory && (
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wide transition-colors -mb-px border-b-2 ${
                    activeTab === "history"
                      ? "text-white border-[#e50914]"
                      : "text-white/50 border-transparent hover:text-white hover:border-white/20"
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" />
                  Lịch Sử Đặt Vé
                </button>
              )}
            </div>

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <form onSubmit={handleSave} className="space-y-6">
                {/* Personal info */}
                <div className="bg-[#1c1b1b] border border-[#5e3f3b]/30 rounded-2xl p-6 space-y-5">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#e9bcb6]/70 border-b border-[#5e3f3b]/25 pb-3">
                    Thông Tin Cá Nhân
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Họ và Tên
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        className={inputCls}
                        value={form.fullName}
                        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                        placeholder="Nhập họ và tên"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> Email
                        </span>
                      </label>
                      <input
                        type="email"
                        required
                        className={inputCls}
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="Nhập địa chỉ email"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> Số Điện Thoại
                        </span>
                      </label>
                      <input
                        type="tel"
                        required
                        className={inputCls}
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="Nhập số điện thoại"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3 h-3" /> Giới Tính
                        </span>
                      </label>
                      <select
                        className={inputCls + " cursor-pointer"}
                        value={form.gender}
                        onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                      >
                        <option value="">-- Chọn giới tính --</option>
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                      </select>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> Ngày Sinh
                        </span>
                      </label>
                      <input
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        className={inputCls + " [color-scheme:dark]"}
                        value={form.dateOfBirth}
                        onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" /> Địa Chỉ
                        </span>
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Nhập địa chỉ"
                      />
                    </div>
                  </div>
                </div>

                {/* Read-only info */}
                <div className="bg-[#1c1b1b] border border-[#5e3f3b]/30 rounded-2xl p-6 space-y-4">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#e9bcb6]/70 border-b border-[#5e3f3b]/25 pb-3">
                    Thông Tin Tài Khoản
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <IdCard className="w-3 h-3" /> Mã Tài Khoản
                        </span>
                      </p>
                      <p className="text-sm text-white/60 font-mono bg-[#1a1a1a] border border-[#5e3f3b]/20 rounded-lg px-4 py-3 cursor-not-allowed">
                        {accountId}
                      </p>
                    </div>
                    <div>
                      <p className={labelCls}>
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Tên Đăng Nhập
                        </span>
                      </p>
                      <p className="text-sm text-white/60 bg-[#1a1a1a] border border-[#5e3f3b]/20 rounded-lg px-4 py-3 cursor-not-allowed">
                        {currentUser.username}
                      </p>
                    </div>
                    <div>
                      <p className={labelCls}>Vai Trò</p>
                      <p className="text-sm text-white/60 bg-[#1a1a1a] border border-[#5e3f3b]/20 rounded-lg px-4 py-3 cursor-not-allowed">
                        {roleName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2.5 bg-[#e50914] hover:bg-[#b20710] disabled:opacity-60 text-white font-bold px-8 py-3 rounded-lg text-sm uppercase tracking-wider transition-all active:scale-95 shadow-[0_4px_16px_rgba(229,9,20,0.35)]"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
                  </button>
                </div>
              </form>
            )}

            {/* ── BOOKING HISTORY TAB ── */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <p className="text-white/50 text-xs uppercase tracking-widest font-bold">
                    {loadingHistory ? "Đang tải..." : `${bookingHistory.length} vé`}
                  </p>
                  <button
                    onClick={fetchBookingHistory}
                    disabled={loadingHistory}
                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                    Làm mới
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 text-[#e50914]/60 animate-spin" />
                    <p className="text-white/40 text-sm">Đang tải lịch sử...</p>
                  </div>
                ) : bookingHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Ticket className="w-7 h-7 text-white/20" />
                    </div>
                    <div>
                      <p className="text-white/50 text-sm font-semibold">Chưa có vé đặt nào</p>
                      <p className="text-white/25 text-xs mt-1">Các vé bạn đặt sẽ xuất hiện ở đây</p>
                    </div>
                    <button
                      onClick={onBack}
                      className="mt-2 flex items-center gap-2 bg-[#e50914] hover:brightness-110 active:scale-95 text-white font-bold px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      Đặt Vé Ngay
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookingHistory.map((booking) => {
                      // A thin left-edge stripe so status reads before any text is parsed.
                      const edgeColor =
                        booking.status === 1
                          ? "before:bg-green-500"
                          : booking.status === 2
                          ? "before:bg-blue-500"
                          : "before:bg-[#5e3f3b]";
                      return (
                      <div
                        key={booking.invoiceId}
                        className={`relative overflow-hidden bg-[#1c1b1b] border border-[#5e3f3b]/30 rounded-xl p-4 pl-5 hover:border-[#5e3f3b]/60 transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 ${edgeColor}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Ticket className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                              <h3 className="text-white font-bold text-sm truncate">
                                {booking.movieName}
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50 pl-5">
                              <span>
                                {formatDate(booking.showDate)}
                                {booking.showTime ? ` · ${booking.showTime}` : ""}
                              </span>
                              {booking.seats && (
                                <span>Ghế: <span className="text-white/70">{booking.seats}</span></span>
                              )}
                              {booking.bookingDate && (
                                <span>Đặt ngày: {formatDate(booking.bookingDate)}</span>
                              )}
                            </div>
                            <p className="text-[#ffb4aa] font-bold text-sm pl-5">
                              {formatMoney(booking.totalMoney ?? 0)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-2.5 shrink-0">
                            {booking.checkinStatus !== 1 && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  booking.status === 1
                                    ? "bg-green-900/30 text-green-400 border-green-700/40"
                                    : booking.status === 2
                                    ? "bg-blue-900/30 text-blue-400 border-blue-700/40"
                                    : "bg-gray-800/50 text-gray-400 border-gray-600/30"
                                }`}
                              >
                                {booking.status === 1 ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : booking.status === 2 ? (
                                  <Clock3 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {booking.status === 1
                                  ? "Đã xác nhận"
                                  : booking.status === 2
                                  ? "Chờ xác nhận"
                                  : "Đã hủy"}
                              </span>
                            )}

                            {booking.ticketMode === "ONLINE" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-900/30 text-emerald-400 border-emerald-700/40">
                                <Ticket className="w-3 h-3" />
                                Vé xem online
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  booking.checkinStatus === 1
                                    ? "bg-emerald-900/30 text-emerald-400 border-emerald-700/40"
                                    : "bg-[#e9c349]/10 text-[#e9c349] border-[#e9c349]/40"
                                }`}
                                title={booking.checkinTime ? `Check-in lúc ${booking.checkinTime}` : undefined}
                              >
                                {booking.checkinStatus === 1 ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <QrCode className="w-3 h-3" />
                                )}
                                {booking.checkinStatus === 1 ? "Đã Check-in" : "Chờ Check-in"}
                              </span>
                            )}

                            {(booking.status === 1 || booking.status === 2) && (
                              cancelConfirmId === booking.invoiceId ? (
                                <div className="flex flex-col items-end gap-1.5">
                                  <p className="text-[10px] text-white/50 text-right max-w-[140px]">
                                    Xác nhận hủy vé này?
                                  </p>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => setCancelConfirmId(null)}
                                      className="text-[11px] px-3 py-1 border border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors"
                                    >
                                      Không
                                    </button>
                                    <button
                                      onClick={() => handleCancelBooking(booking.invoiceId)}
                                      disabled={cancellingId === booking.invoiceId}
                                      className="text-[11px] px-3 py-1 bg-[#e50914] text-white rounded-lg disabled:opacity-60 hover:bg-[#b20710] transition-colors flex items-center gap-1"
                                    >
                                      {cancellingId === booking.invoiceId ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <XCircle className="w-3 h-3" />
                                      )}
                                      Hủy vé
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCancelConfirmId(booking.invoiceId)}
                                  className="text-[11px] text-[#e50914] hover:text-white border border-[#e50914]/40 hover:bg-[#e50914] px-3 py-1 rounded-lg transition-all"
                                >
                                  Hủy vé
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
