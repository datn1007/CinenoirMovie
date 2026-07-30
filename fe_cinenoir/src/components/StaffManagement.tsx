import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Mail,
  Smartphone,
  AlertCircle,
  ShieldCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { AnimatePresence } from "motion/react";

import { API_BASE_URL } from "../lib/apiConfig";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { isBlank, isNameLike, isNotFutureDate, isPasswordStrongEnough, isValidEmail, isValidVietnamesePhone } from "../lib/validation";
import {
  PageHeader,
  RefreshButton,
  PrimaryButton,
  SecondaryButton,
  SearchInput,
  Badge,
  IconButton,
  StatCard,
  EmptyState,
  SkeletonRows,
  Toast,
  ModalShell,
  ModalHeader,
  FieldLabel,
  inputClass,
} from "./admin/AdminUI";
const getToken = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

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

interface FormData {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  roleId: number;
  status: number;
}

const defaultForm: FormData = {
  username: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  gender: "Nam",
  dateOfBirth: "",
  address: "",
  roleId: 2,
  status: 1,
};

const ROLE_LABELS: Record<number, string> = {
  1: "Quản Trị Viên",
  2: "Nhân Viên",
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<AccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Lỗi tải danh sách nhân sự");
      const all: AccountDTO[] = await res.json();
      // Chỉ lấy tài khoản không phải khách hàng (roleId != 3)
      setStaff(all.filter((a) => a.roleId !== 3));
    } catch (err: any) {
      setError(err.message ?? "Lỗi kết nối backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filtered = staff.filter((s) => {
    const matchSearch =
      (s.fullName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.accountId ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.username ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = showInactive ? s.status === 0 : s.status !== 0;
    return matchSearch && matchStatus;
  });

  const activeCount = staff.filter((s) => s.status !== 0).length;
  const inactiveCount = staff.filter((s) => s.status === 0).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (s: AccountDTO) => {
    setEditingId(s.accountId);
    setForm({
      username: s.username,
      password: "",
      fullName: s.fullName ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      gender: s.gender ?? "Nam",
      dateOfBirth: s.dateOfBirth ?? "",
      address: s.address ?? "",
      roleId: s.roleId,
      status: s.status,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlank(form.fullName) || !isNameLike(form.fullName)) {
      return alert("Họ và tên không hợp lệ (chỉ được chứa chữ cái và khoảng trắng).");
    }
    if (!isValidEmail(form.email)) {
      return alert("Email không hợp lệ.");
    }
    if (!isValidVietnamesePhone(form.phone)) {
      return alert("Số điện thoại không hợp lệ (định dạng Việt Nam, ví dụ 0912345678).");
    }
    if (!isNotFutureDate(form.dateOfBirth)) {
      return alert("Ngày sinh không được lớn hơn ngày hiện tại.");
    }
    if (!editingId) {
      if (isBlank(form.username)) return alert("Vui lòng nhập tên đăng nhập.");
      if (!isPasswordStrongEnough(form.password)) {
        return alert("Mật khẩu chưa đủ mạnh: cần ít nhất 8 ký tự và 3 trong 4 loại ký tự (hoa/thường/số/đặc biệt).");
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          roleId: form.roleId,
          status: form.status,
        };
        const res = await fetch(`${API_BASE_URL}/api/admin/accounts/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast("Cập nhật nhân sự thành công!");
      } else {
        const res = await fetch(`${API_BASE_URL}/api/admin/accounts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast("Thêm nhân sự mới thành công!");
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      alert(err.message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts/${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setDeleteConfirmId(null);
      showToast("Đã vô hiệu hoá tài khoản.");
      fetchStaff();
    } catch (err: any) {
      alert(err.message ?? "Xóa thất bại");
    }
  };

  const handleRestore = async (s: AccountDTO) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts/${s.accountId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: 1 }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Đã khôi phục tài khoản.");
      fetchStaff();
    } catch (err: any) {
      alert(err.message ?? "Khôi phục thất bại");
    }
  };

  const setField = (key: keyof FormData, val: string | number) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>

      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <PageHeader
          title="Quản Lý Nhân Sự"
          subtitle="CRUD tài khoản nhân sự, phân quyền và quản lý trạng thái hoạt động."
          actions={
            <>
              <RefreshButton onClick={fetchStaff} loading={loading} />
              <PrimaryButton icon={Plus} onClick={openCreate}>
                Thêm Nhân Sự
              </PrimaryButton>
            </>
          }
        />

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Users} label="Tổng Nhân Sự" value={staff.length} tone="red" />
          <StatCard icon={ShieldCheck} label="Đang Hoạt Động" value={activeCount} tone="green" />
          <StatCard icon={UserX} label="Đã Vô Hiệu Hoá" value={inactiveCount} tone="gold" />
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] shadow-xl">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-[#5e3f3b]/30 bg-white/[0.02] p-5 md:flex-row">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">Danh Sách Nhân Sự</h3>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`cursor-pointer rounded-full border px-2.5 py-1 text-[9px] font-black uppercase transition-colors duration-200 ${
                  showInactive
                    ? "border-[#e9bcb6]/30 bg-[#e9bcb6]/10 text-[#e9bcb6]"
                    : "border-[#e50914]/30 bg-[#e50914]/10 text-[#ffb4aa]"
                }`}
              >
                {showInactive ? "Xem Đang Hoạt Động" : "Xem Đã Vô Hiệu"}
              </button>
            </div>
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Tìm kiếm nhân sự..." className="w-full md:w-64" />
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#e9bcb6]/60">
              <AlertCircle className="h-8 w-8 text-[#e50914]" />
              <p className="text-xs">{error}</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#5e3f3b]/30 bg-[#1a1919] text-[10px] font-semibold uppercase tracking-wider text-[#af8782]">
                    <th className="p-4 pl-6">Nhân Sự</th>
                    <th className="p-4">Tài Khoản</th>
                    <th className="p-4">Vai Trò</th>
                    <th className="p-4">Liên Hệ</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4 pr-6 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#5e3f3b]/12 text-[#e5e2e1]">
                  {loading ? (
                    <SkeletonRows columns={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={Users}
                          title={searchTerm ? "Không tìm thấy kết quả phù hợp." : "Không có nhân sự nào."}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr
                        key={s.accountId}
                        className={`transition-colors duration-150 hover:bg-white/[0.03] ${s.status === 0 ? "opacity-50" : ""}`}
                      >
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#5e3f3b]/30 bg-[#e50914]/20 text-sm font-bold text-[#ffb4aa]">
                              {(s.fullName ?? s.username ?? "?")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold leading-tight">{s.fullName || "—"}</p>
                              <p className="mt-0.5 text-[10px] text-[#e9bcb6]/55">{s.accountId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[#e9bcb6]/80">{s.username}</td>
                        <td className="p-4">
                          <Badge tone={s.roleId === 1 ? "gold" : "neutral"}>
                            {ROLE_LABELS[s.roleId] ?? s.roleName ?? `Role ${s.roleId}`}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <p className="flex items-center gap-1.5 font-medium text-white">
                              <Mail className="h-3 w-3 shrink-0 text-[#ffb4aa]/65" />
                              <span className="max-w-[180px] truncate">{s.email || "—"}</span>
                            </p>
                            <p className="flex items-center gap-1.5 text-[#e9bcb6]/65">
                              <Smartphone className="h-3 w-3 shrink-0 text-[#ffb4aa]/65" />
                              <span className="font-mono text-[10px]">{s.phone || "—"}</span>
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge tone={s.status !== 0 ? "success" : "neutral"}>
                            {s.status !== 0 ? "Hoạt Động" : "Vô Hiệu"}
                          </Badge>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {deleteConfirmId === s.accountId ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDelete(s.accountId)}
                                className="cursor-pointer rounded-lg bg-[#e50914] px-2.5 py-1 text-[9px] font-black uppercase text-white hover:brightness-110"
                              >
                                Xác Nhận
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="cursor-pointer rounded-lg border border-[#5e3f3b]/40 px-2.5 py-1 text-[9px] font-black uppercase text-[#e9bcb6]/70 hover:bg-white/[0.05]"
                              >
                                Huỷ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {s.status === 0 ? (
                                <IconButton icon={ShieldCheck} title="Khôi phục tài khoản" tone="success" onClick={() => handleRestore(s)} />
                              ) : (
                                <>
                                  <IconButton icon={Edit3} title="Chỉnh sửa" onClick={() => openEdit(s)} />
                                  <IconButton icon={UserX} title="Vô hiệu hoá" tone="danger" onClick={() => setDeleteConfirmId(s.accountId)} />
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal tạo / chỉnh sửa */}
      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} maxWidth="max-w-lg">
          <ModalHeader title={editingId ? "Chỉnh Sửa Nhân Sự" : "Thêm Nhân Sự Mới"} onClose={() => setShowModal(false)} />

          <form onSubmit={handleSave} className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel required>Họ và Tên</FieldLabel>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={inputClass}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <FieldLabel required>Tên Đăng Nhập</FieldLabel>
                <input
                  required
                  disabled={!!editingId}
                  value={form.username}
                  onChange={(e) => setField("username", e.target.value)}
                  placeholder="nguyen_van_a"
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </div>
            </div>

            {!editingId && (
              <div>
                <FieldLabel required>Mật Khẩu</FieldLabel>
                <input
                  required={!editingId}
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Mật khẩu mạnh"
                  className={inputClass}
                />
                <PasswordStrengthMeter password={form.password} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Vai Trò</FieldLabel>
                <select
                  value={form.roleId}
                  onChange={(e) => setField("roleId", Number(e.target.value))}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value={2}>Nhân Viên</option>
                  <option value={1}>Quản Trị Viên</option>
                </select>
              </div>

              <div>
                <FieldLabel>Giới Tính</FieldLabel>
                <select
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel required>Email</FieldLabel>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="name@cinenoir.com"
                  className={inputClass}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <FieldLabel required>Số Điện Thoại</FieldLabel>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0901 234 567"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Ngày Sinh</FieldLabel>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={(e) => setField("dateOfBirth", e.target.value)}
                  className={inputClass}
                />
              </div>

              {editingId && (
                <div>
                  <FieldLabel>Trạng Thái</FieldLabel>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", Number(e.target.value))}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value={1}>Hoạt Động</option>
                    <option value={0}>Vô Hiệu Hoá</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>Địa Chỉ</FieldLabel>
              <textarea
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Số nhà, đường, phường, quận..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 text-xs font-bold">
              <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                Huỷ
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? "Lưu Thay Đổi" : "Tạo Nhân Sự"}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
