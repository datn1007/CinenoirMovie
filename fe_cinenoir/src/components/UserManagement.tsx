import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, UserCheck, UserX, AlertCircle, Users } from "lucide-react";

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
  EmptyState,
  SkeletonRows,
  ModalShell,
  ModalHeader,
  ModalFooter,
  FieldLabel,
  inputClass,
} from "./admin/AdminUI";

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

interface AccountFormData {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  status: number;
  roleId: number;
}

const defaultForm: AccountFormData = {
  username: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  gender: "Nam",
  dateOfBirth: "",
  address: "",
  status: 1,
  roleId: 3,
};

const getToken = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

export default function UserManagement() {
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
      const data: AccountDTO[] = await res.json();
      setAccounts(data);
    } catch (e: any) {
      setError(e.message ?? "Không thể tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (account: AccountDTO) => {
    setEditingId(account.accountId);
    setForm({
      username: account.username,
      password: "",
      fullName: account.fullName ?? "",
      email: account.email ?? "",
      phone: account.phone ?? "",
      gender: account.gender ?? "Nam",
      dateOfBirth: account.dateOfBirth ?? "",
      address: account.address ?? "",
      status: account.status ?? 1,
      roleId: account.roleId ?? 3,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const isEditNow = editingId !== null;
    if (!isEditNow) {
      if (isBlank(form.username)) return setFormError("Vui lòng nhập tên đăng nhập.");
      if (!isPasswordStrongEnough(form.password)) {
        return setFormError("Mật khẩu chưa đủ mạnh: cần ít nhất 8 ký tự và 3 trong 4 loại ký tự (hoa/thường/số/đặc biệt).");
      }
    }
    if (isBlank(form.fullName) || !isNameLike(form.fullName)) {
      return setFormError("Họ và tên không hợp lệ (chỉ được chứa chữ cái và khoảng trắng).");
    }
    if (!isValidEmail(form.email)) {
      return setFormError("Email không hợp lệ.");
    }
    if (!isValidVietnamesePhone(form.phone)) {
      return setFormError("Số điện thoại không hợp lệ (định dạng Việt Nam, ví dụ 0912345678).");
    }
    if (!isNotFutureDate(form.dateOfBirth)) {
      return setFormError("Ngày sinh không được lớn hơn ngày hiện tại.");
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const isEdit = editingId !== null;
      const url = isEdit
        ? `${API_BASE_URL}/api/admin/accounts/${editingId}`
        : `${API_BASE_URL}/api/admin/accounts`;

      const body = isEdit
        ? {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            gender: form.gender,
            dateOfBirth: form.dateOfBirth,
            address: form.address,
            status: form.status,
            roleId: form.roleId,
          }
        : {
            username: form.username,
            password: form.password,
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            gender: form.gender,
            dateOfBirth: form.dateOfBirth,
            address: form.address,
            status: form.status,
            roleId: form.roleId,
          };

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Lỗi ${res.status}`);
      }

      setShowModal(false);
      fetchAccounts();
    } catch (e: any) {
      setFormError(e.message ?? "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      setDeleteConfirmId(null);
      fetchAccounts();
    } catch (e: any) {
      alert("Xóa thất bại: " + e.message);
    }
  };

  const filtered = accounts.filter(
    (a) =>
      (a.username ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.fullName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.accountId ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <section className="space-y-6 animate-fade-in">
        {/* Header */}
        <PageHeader
          title="Quản Lý Người Dùng"
          subtitle="Danh sách tài khoản người dùng trong hệ thống"
          actions={
            <>
              <RefreshButton onClick={fetchAccounts} loading={loading} />
              <PrimaryButton icon={Plus} onClick={openCreate}>
                Thêm Người Dùng
              </PrimaryButton>
            </>
          }
        />

        {/* Search */}
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm theo ID, username, họ tên, email..."
            className="max-w-sm flex-1"
          />
          <span className="whitespace-nowrap text-xs text-[#e9bcb6]/60">{filtered.length} tài khoản</span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-[#e50914]/30 bg-[#93000a]/15 px-4 py-3 text-xs text-[#ffb4aa]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={fetchAccounts} className="ml-auto underline hover:no-underline cursor-pointer">
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        {!error && (
          <div className="overflow-hidden rounded-2xl border border-[#5e3f3b]/25 shadow-lg">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#5e3f3b]/25 bg-[#1a1919]">
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">ID</th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">Username</th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">Họ Tên</th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">Email</th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">SĐT</th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">Vai Trò</th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-[#af8782]">Trạng Thái</th>
                    <th className="px-4 py-3.5 text-right font-black uppercase tracking-wider text-[#af8782]">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#5e3f3b]/12 bg-[#1c1a1a]">
                  {loading ? (
                    <SkeletonRows columns={8} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          icon={Users}
                          title={searchTerm ? "Không tìm thấy kết quả phù hợp." : "Chưa có tài khoản nào."}
                          message={searchTerm ? "Thử một từ khóa tìm kiếm khác." : "Nhấn “Thêm Người Dùng” để bắt đầu."}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((account) => (
                      <tr
                        key={account.accountId}
                        className="transition-colors duration-150 hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-[#ffb4aa]">{account.accountId}</td>
                        <td className="px-4 py-3.5 font-semibold text-[#e5e2e1]">{account.username}</td>
                        <td className="px-4 py-3.5 text-[#e5e2e1]">{account.fullName || "—"}</td>
                        <td className="px-4 py-3.5 text-[#e9bcb6]/80">{account.email || "—"}</td>
                        <td className="px-4 py-3.5 text-[#e9bcb6]/80">{account.phone || "—"}</td>
                        <td className="px-4 py-3.5">
                          <Badge tone={account.roleId === 1 ? "error" : "neutral"}>
                            {account.roleName || `Role ${account.roleId}`}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={account.status === 1 ? "success" : "error"} icon={account.status === 1 ? UserCheck : UserX}>
                            {account.status === 1 ? "Hoạt động" : "Vô hiệu"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <IconButton icon={Edit2} title="Chỉnh sửa" onClick={() => openEdit(account)} />
                            <IconButton
                              icon={Trash2}
                              title="Xóa"
                              tone="danger"
                              onClick={() => setDeleteConfirmId(account.accountId)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {showModal && (
        <ModalShell onClose={() => setShowModal(false)} maxWidth="max-w-lg">
          <ModalHeader
            title={editingId ? "Chỉnh Sửa Tài Khoản" : "Tạo Tài Khoản Mới"}
            onClose={() => setShowModal(false)}
          />

          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-[#e50914]/30 bg-[#93000a]/15 px-4 py-3 text-xs text-[#ffb4aa]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {!editingId && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Username</FieldLabel>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className={inputClass}
                    placeholder="username"
                  />
                </div>
                <div>
                  <FieldLabel required>Mật khẩu</FieldLabel>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                  <PasswordStrengthMeter password={form.password} />
                </div>
              </div>
            )}

            <div>
              <FieldLabel required>Họ Tên</FieldLabel>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputClass}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Email</FieldLabel>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <FieldLabel required>Số Điện Thoại</FieldLabel>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                  placeholder="0901234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Giới Tính</FieldLabel>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <FieldLabel>Ngày Sinh</FieldLabel>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Địa Chỉ</FieldLabel>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputClass}
                placeholder="123 Đường ABC, TP.HCM"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Vai Trò</FieldLabel>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value={1}>Admin / Nhân Viên</option>
                  <option value={3}>Khách Hàng</option>
                </select>
              </div>
              <div>
                <FieldLabel>Trạng Thái</FieldLabel>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value={1}>Hoạt động</option>
                  <option value={0}>Vô hiệu hóa</option>
                </select>
              </div>
            </div>
          </div>

          <ModalFooter>
            <SecondaryButton onClick={() => setShowModal(false)}>Hủy</SecondaryButton>
            <PrimaryButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Đang lưu..." : editingId ? "Cập Nhật" : "Tạo Tài Khoản"}
            </PrimaryButton>
          </ModalFooter>
        </ModalShell>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <ModalShell onClose={() => setDeleteConfirmId(null)} maxWidth="max-w-sm">
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#93000a]/20">
                <Trash2 className="h-5 w-5 text-[#e50914]" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Xác Nhận Xóa</h3>
                <p className="mt-0.5 text-xs text-[#e9bcb6]/60">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-xs text-[#e9bcb6]/80">
              Bạn có chắc muốn xóa tài khoản <span className="font-bold text-[#ffb4aa]">{deleteConfirmId}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={() => setDeleteConfirmId(null)}>Hủy</SecondaryButton>
              <PrimaryButton onClick={() => handleDelete(deleteConfirmId)}>Xóa</PrimaryButton>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
