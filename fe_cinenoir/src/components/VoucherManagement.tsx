import React, { useState, useEffect, useCallback } from "react";
import {
  TicketPercent,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Tag,
  CalendarRange,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { AnimatePresence } from "motion/react";

import { API_BASE_URL } from "../lib/apiConfig";
import { formatDate as sharedFormatDate } from "../lib/formatDate";
import { isBlank, isDateRangeValid } from "../lib/validation";
import {
  PageHeader,
  RefreshButton,
  PrimaryButton,
  SecondaryButton,
  SearchInput,
  Badge,
  BadgeTone,
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

interface VoucherDTO {
  id: number;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
  description: string | null;
  status: number;
}

interface FormData {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderValue: string;
  maxUses: string;
  validFrom: string;
  validTo: string;
  description: string;
  status: number;
}

const defaultForm: FormData = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderValue: "",
  maxUses: "",
  validFrom: "",
  validTo: "",
  description: "",
  status: 1,
};

function formatMoney(val: number | null | undefined) {
  if (val == null) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
}

function formatDate(dateStr: string | null) {
  return sharedFormatDate(dateStr);
}

function statusOfVoucher(v: VoucherDTO): "active" | "inactive" | "expired" | "full" {
  if (v.status === 0) return "inactive";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (v.validTo) {
    const to = new Date(v.validTo + "T00:00:00");
    if (today > to) return "expired";
  }
  if (v.maxUses != null && v.usedCount >= v.maxUses) return "full";
  return "active";
}

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Đang hoạt động", tone: "success" },
  inactive: { label: "Vô hiệu", tone: "neutral" },
  expired: { label: "Hết hạn", tone: "neutral" },
  full: { label: "Hết lượt", tone: "warning" },
};

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState<VoucherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vouchers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách voucher");
      setVouchers(await res.json());
    } catch (err: any) {
      setError(err.message ?? "Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const filtered = vouchers.filter(
    (v) =>
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = vouchers.filter((v) => statusOfVoucher(v) === "active").length;

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (v: VoucherDTO) => {
    setEditingId(v.id);
    setForm({
      code: v.code,
      discountType: v.discountType,
      discountValue: v.discountValue?.toString() ?? "",
      minOrderValue: v.minOrderValue?.toString() ?? "",
      maxUses: v.maxUses?.toString() ?? "",
      validFrom: v.validFrom ?? "",
      validTo: v.validTo ?? "",
      description: v.description ?? "",
      status: v.status,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlank(form.code)) {
      alert("Vui lòng nhập mã giảm giá.");
      return;
    }
    const discountValue = Number(form.discountValue);
    if (!form.discountValue || isNaN(discountValue) || discountValue <= 0) {
      alert("Vui lòng nhập giá trị giảm giá hợp lệ (lớn hơn 0).");
      return;
    }
    if (form.discountType === "PERCENTAGE" && discountValue > 100) {
      alert("Giá trị giảm giá theo phần trăm không được lớn hơn 100.");
      return;
    }
    if (form.minOrderValue && Number(form.minOrderValue) < 0) {
      alert("Giá trị đơn hàng tối thiểu không được âm.");
      return;
    }
    if (form.maxUses && (isNaN(Number(form.maxUses)) || Number(form.maxUses) < 1)) {
      alert("Số lượt sử dụng tối đa phải là số nguyên dương.");
      return;
    }
    if (!isDateRangeValid(form.validFrom, form.validTo)) {
      alert("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    setSaving(true);
    const body = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      description: form.description || null,
      status: form.status,
    };

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/admin/vouchers/${editingId}`
        : `${API_BASE_URL}/api/admin/vouchers`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(editingId ? "Cập nhật voucher thành công!" : "Tạo voucher mới thành công!");
      setShowModal(false);
      fetchVouchers();
    } catch (err: any) {
      alert(err.message ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/vouchers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setDeleteConfirmId(null);
      showToast("Đã vô hiệu hoá voucher.");
      fetchVouchers();
    } catch (err: any) {
      alert(err.message ?? "Xoá thất bại");
    }
  };

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>

      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <PageHeader
          title="Mã Giảm Giá"
          subtitle="Tạo và quản lý voucher giảm giá theo phần trăm hoặc số tiền cố định."
          actions={
            <>
              <RefreshButton onClick={fetchVouchers} loading={loading} />
              <PrimaryButton icon={Plus} onClick={openCreate}>
                Tạo Voucher
              </PrimaryButton>
            </>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Tag} label="Tổng Voucher" value={vouchers.length} tone="red" />
          <StatCard icon={CheckCircle2} label="Đang Hoạt Động" value={activeCount} tone="green" />
          <StatCard
            icon={TicketPercent}
            label="Tổng Lượt Dùng"
            value={vouchers.reduce((s, v) => s + (v.usedCount ?? 0), 0)}
            tone="gold"
          />
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] shadow-xl">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-[#5e3f3b]/30 bg-white/[0.02] p-5 md:flex-row">
            <h3 className="text-base font-bold text-white">Danh Sách Voucher</h3>
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Tìm mã hoặc mô tả..." className="w-full md:w-64" />
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#e9bcb6]/60">
              <AlertCircle className="h-8 w-8 text-[#e50914]" />
              <p className="text-xs">{error}</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[#5e3f3b]/30 bg-[#1a1919] text-[10px] font-semibold uppercase tracking-wider text-[#af8782]">
                    <th className="p-4 pl-6">Mã Voucher</th>
                    <th className="p-4">Loại Giảm Giá</th>
                    <th className="p-4">Giá Trị</th>
                    <th className="p-4">Đơn Tối Thiểu</th>
                    <th className="p-4">Thời Hạn</th>
                    <th className="p-4">Lượt Dùng</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4 pr-6 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#5e3f3b]/12 text-[#e5e2e1]">
                  {loading ? (
                    <SkeletonRows columns={8} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          icon={TicketPercent}
                          title={searchTerm ? "Không tìm thấy kết quả phù hợp." : "Chưa có voucher nào."}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((v) => {
                      const st = statusOfVoucher(v);
                      const badge = STATUS_BADGE[st];
                      return (
                        <tr key={v.id} className="transition-colors duration-150 hover:bg-white/[0.03]">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3.5 w-3.5 shrink-0 text-[#e50914]" />
                              <span className="font-mono font-black tracking-wide text-white">{v.code}</span>
                            </div>
                            {v.description && (
                              <p className="mt-1 max-w-[180px] truncate text-[10px] text-[#e9bcb6]/50">{v.description}</p>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge tone={v.discountType === "PERCENTAGE" ? "error" : "gold"}>
                              {v.discountType === "PERCENTAGE" ? "Phần Trăm" : "Số Tiền Cố Định"}
                            </Badge>
                          </td>
                          <td className="p-4 font-bold text-white">
                            {v.discountType === "PERCENTAGE" ? `${v.discountValue}%` : formatMoney(v.discountValue)}
                          </td>
                          <td className="p-4 text-[#e9bcb6]/75">{formatMoney(v.minOrderValue)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-[#e9bcb6]/65">
                              <CalendarRange className="h-3 w-3 shrink-0" />
                              <span className="text-[10px]">
                                {formatDate(v.validFrom)} – {formatDate(v.validTo)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-[#e9bcb6]/80">
                              {v.usedCount ?? 0}
                              {v.maxUses != null && <span className="text-[#af8782]/60"> / {v.maxUses}</span>}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge tone={badge.tone}>{badge.label}</Badge>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {deleteConfirmId === v.id ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDelete(v.id)}
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
                                <IconButton icon={Edit3} title="Chỉnh sửa" onClick={() => openEdit(v)} />
                                <IconButton icon={Trash2} title="Vô hiệu hoá" tone="danger" onClick={() => setDeleteConfirmId(v.id)} />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
          <ModalHeader
            icon={TicketPercent}
            title={editingId ? "Chỉnh Sửa Voucher" : "Tạo Voucher Mới"}
            onClose={() => setShowModal(false)}
          />

          <form onSubmit={handleSave} className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 text-xs">
            <div>
              <FieldLabel required>Mã Voucher</FieldLabel>
              <input
                required
                disabled={!!editingId}
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="vd. SUMMER20"
                className={`${inputClass} font-mono tracking-widest disabled:cursor-not-allowed disabled:opacity-50`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Loại Giảm Giá</FieldLabel>
                <select
                  value={form.discountType}
                  onChange={(e) => setField("discountType", e.target.value as "PERCENTAGE" | "FIXED")}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="PERCENTAGE">Phần trăm (%)</option>
                  <option value="FIXED">Số tiền cố định (VNĐ)</option>
                </select>
              </div>

              <div>
                <FieldLabel required>
                  Giá Trị{" "}
                  <span className="normal-case font-medium text-[#af8782]/60">
                    {form.discountType === "PERCENTAGE" ? "(%)" : "(VNĐ)"}
                  </span>
                </FieldLabel>
                <input
                  required
                  type="number"
                  min="0"
                  max={form.discountType === "PERCENTAGE" ? "100" : undefined}
                  value={form.discountValue}
                  onChange={(e) => setField("discountValue", e.target.value)}
                  placeholder={form.discountType === "PERCENTAGE" ? "vd. 20" : "vd. 50000"}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Đơn Hàng Tối Thiểu (VNĐ)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.minOrderValue}
                  onChange={(e) => setField("minOrderValue", e.target.value)}
                  placeholder="vd. 100000"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>Số Lần Dùng Tối Đa</FieldLabel>
                <input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setField("maxUses", e.target.value)}
                  placeholder="Không giới hạn"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Ngày Bắt Đầu</FieldLabel>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setField("validFrom", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Ngày Kết Thúc</FieldLabel>
                <input
                  type="date"
                  value={form.validTo}
                  onChange={(e) => setField("validTo", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Mô Tả</FieldLabel>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Mô tả ngắn về voucher..."
                rows={2}
                className={`${inputClass} resize-none`}
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

            <div className="flex justify-end gap-3 pt-3 text-xs font-bold">
              <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                Huỷ
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? "Lưu Thay Đổi" : "Tạo Voucher"}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
