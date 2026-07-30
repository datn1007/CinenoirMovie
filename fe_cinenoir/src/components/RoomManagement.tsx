import React, { useState } from "react";
import { AnimatePresence } from "motion/react";
import { CinemaRoom, CinemaRoomSeat } from "../types";
import { Plus, Pencil, Trash2, Eye, Armchair, Building2, Loader2 } from "lucide-react";

import { API_BASE_URL as API_BASE } from "../lib/apiConfig";
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SearchInput,
  Badge,
  IconButton,
  StatCard,
  EmptyState,
  ModalShell,
  ModalHeader,
  ConfirmDialog,
  Toast,
  FieldLabel,
  inputClass,
} from "./admin/AdminUI";

interface RoomManagementProps {
  rooms: CinemaRoom[];
  onReload: () => void;
}

type ModalMode = "create" | "edit" | null;

const jwt = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

export default function RoomManagement({ rooms, onReload }: RoomManagementProps) {
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editRoom, setEditRoom] = useState<CinemaRoom | null>(null);
  const [formName, setFormName] = useState("");
  const [formSeats, setFormSeats] = useState<number>(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Seat map modal
  const [seatRoom, setSeatRoom] = useState<CinemaRoom | null>(null);
  const [seats, setSeats] = useState<CinemaRoomSeat[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);

  // Soft-delete confirmation
  const [deleteRoom, setDeleteRoom] = useState<CinemaRoom | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string, ok = false) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = rooms.filter((r) =>
    r.cinemaRoomName.toLowerCase().includes(search.toLowerCase())
  );

  const totalSeats = rooms.reduce((s, r) => s + r.seatQuantity, 0);

  // ── Open create modal ──
  const openCreate = () => {
    setFormName("");
    setFormSeats(100);
    setError("");
    setEditRoom(null);
    setModalMode("create");
  };

  // ── Open edit modal ──
  const openEdit = (room: CinemaRoom) => {
    setFormName(room.cinemaRoomName);
    setFormSeats(room.seatQuantity);
    setError("");
    setEditRoom(room);
    setModalMode("edit");
  };

  // ── Save (create or update) ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { setError("Tên phòng không được để trống."); return; }
    if (!Number.isInteger(formSeats) || formSeats <= 0) { setError("Số ghế phải là số nguyên lớn hơn 0."); return; }
    if (formSeats > 500) { setError("Số ghế không được vượt quá 500."); return; }

    setSaving(true);
    setError("");
    try {
      const isEdit = modalMode === "edit" && editRoom;
      const url = isEdit
        ? `${API_BASE}/api/cinema-rooms/${editRoom.cinemaRoomId}`
        : `${API_BASE}/api/cinema-rooms`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt()}`,
        },
        body: JSON.stringify({ cinemaRoomName: formName.trim(), seatQuantity: formSeats }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModalMode(null);
      onReload();
    } catch {
      setError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // ── Soft delete ──
  const confirmDelete = async () => {
    if (!deleteRoom) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/cinema-rooms/${deleteRoom.cinemaRoomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt()}` },
      });
      if (!res.ok) throw new Error();
      showToast(`Đã ẩn phòng chiếu "${deleteRoom.cinemaRoomName}".`, true);
      setDeleteRoom(null);
      onReload();
    } catch {
      showToast("Xóa thất bại. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Open seat map ──
  const openSeatMap = async (room: CinemaRoom) => {
    setSeatRoom(room);
    setSeats([]);
    setSeatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cinema-rooms/${room.cinemaRoomId}/seats`);
      if (!res.ok) throw new Error();
      const data: CinemaRoomSeat[] = await res.json();
      setSeats(data);
    } catch {
      setSeats([]);
    } finally {
      setSeatsLoading(false);
    }
  };

  // Group seats by row for the seat map grid
  const seatsByRow = seats.reduce<Record<number, CinemaRoomSeat[]>>((acc, seat) => {
    if (!acc[seat.seatRow]) acc[seat.seatRow] = [];
    acc[seat.seatRow].push(seat);
    return acc;
  }, {});

  const rowNumbers = Object.keys(seatsByRow)
    .map(Number)
    .sort((a, b) => a - b);

  const bookedCount = seats.filter((s) => s.booked).length;

  return (
    <>
      <AnimatePresence>{toast && <Toast message={toast.msg} ok={toast.ok} />}</AnimatePresence>

      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <PageHeader
          title="Quản Lý Phòng Chiếu"
          subtitle="Dữ liệu thực từ database — thêm, sửa, xóa phòng chiếu và xem tình trạng ghế đặt."
          actions={
            <PrimaryButton icon={Plus} onClick={openCreate}>
              Thêm Phòng Mới
            </PrimaryButton>
          }
        />

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Building2} label="Tổng Phòng Chiếu" value={rooms.length} tone="red" />
          <StatCard icon={Armchair} label="Tổng Sức Chứa" value={totalSeats.toLocaleString()} tone="blue" />
          <StatCard
            icon={Armchair}
            label="Trung Bình / Phòng"
            value={rooms.length > 0 ? Math.round(totalSeats / rooms.length) : 0}
            tone="gold"
          />
        </section>

        {/* Search + Table */}
        <section className="overflow-hidden rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#5e3f3b]/25 bg-white/[0.02] p-5">
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm phòng chiếu..." className="max-w-sm flex-grow" />
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#5e3f3b]/30 bg-[#1a1919] font-semibold uppercase tracking-wider text-[#af8782]">
                  <th className="p-4 pl-6">ID</th>
                  <th className="p-4">Tên Phòng Chiếu</th>
                  <th className="p-4">Số Ghế</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4 pr-6 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5e3f3b]/12 text-[#e5e2e1]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={Building2}
                        title={rooms.length === 0 ? "Chưa có phòng chiếu nào." : "Không tìm thấy phòng chiếu phù hợp."}
                        message={rooms.length === 0 ? "Nhấn “Thêm Phòng Mới” để bắt đầu." : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((room) => (
                    <tr key={room.cinemaRoomId} className="transition-colors duration-150 hover:bg-white/[0.03]">
                      <td className="p-4 pl-6 font-mono text-[#af8782]">#{room.cinemaRoomId}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-[#ffb4aa]" />
                          <span className="font-bold">{room.cinemaRoomName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Armchair className="h-3.5 w-3.5 text-[#e9c349]" />
                          <span>{room.seatQuantity} ghế</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge tone={(room.status ?? 1) === 1 ? "success" : "neutral"} dot>
                          {(room.status ?? 1) === 1 ? "Hoạt Động" : "Đã Ẩn"}
                        </Badge>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <IconButton icon={Eye} title="Xem sơ đồ ghế" tone="gold" onClick={() => openSeatMap(room)} />
                          <IconButton icon={Pencil} title="Chỉnh sửa" onClick={() => openEdit(room)} />
                          <IconButton icon={Trash2} title="Xóa mềm" tone="danger" onClick={() => setDeleteRoom(room)} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {modalMode && (
        <ModalShell onClose={() => setModalMode(null)} maxWidth="max-w-md">
          <ModalHeader
            title={modalMode === "create" ? "Thêm Phòng Chiếu" : "Chỉnh Sửa Phòng Chiếu"}
            onClose={() => setModalMode(null)}
          />

          <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
            <div>
              <FieldLabel required>Tên Phòng Chiếu</FieldLabel>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="vd. Phòng Chiếu 01"
                className={inputClass}
              />
            </div>

            <div>
              <FieldLabel required>Số Ghế</FieldLabel>
              <input
                type="number"
                required
                min={1}
                value={formSeats}
                onChange={(e) => setFormSeats(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[#e50914]/25 bg-[#e50914]/10 px-3 py-2 text-xs text-[#ffb4aa]">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-3 text-xs font-bold">
              <SecondaryButton type="button" onClick={() => setModalMode(null)}>
                Hủy
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {modalMode === "create" ? "Tạo Phòng" : "Lưu Thay Đổi"}
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ── SEAT MAP MODAL ── */}
      {seatRoom && (
        <ModalShell onClose={() => setSeatRoom(null)} maxWidth="max-w-3xl">
          <ModalHeader
            icon={Armchair}
            title={`Sơ Đồ Ghế — ${seatRoom.cinemaRoomName}`}
            subtitle={
              seats.length > 0
                ? `Tổng ${seats.length} ghế · ${bookedCount} đã đặt · ${seats.length - bookedCount} còn trống`
                : `Tổng ${seats.length} ghế`
            }
            onClose={() => setSeatRoom(null)}
          />

          {/* Seat map body */}
          <div className="flex-1 overflow-y-auto p-6">
            {seatsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#ffb4aa]" />
                <span className="ml-3 text-sm text-[#e9bcb6]/60">Đang tải sơ đồ ghế...</span>
              </div>
            ) : seats.length === 0 ? (
              <EmptyState icon={Armchair} title="Phòng này chưa có dữ liệu ghế trong hệ thống." />
            ) : (
              <>
                {/* Screen */}
                <div className="mb-8 text-center">
                  <div className="inline-block w-2/3 rounded-t border-t-2 border-[#e50914]/60 bg-gradient-to-b from-[#e50914]/30 to-transparent py-2 text-[10px] font-black uppercase tracking-widest text-[#e50914]">
                    Màn Hình
                  </div>
                </div>

                {/* Seat grid — same chair-silhouette seat map as staff & customer views.
                    flex-col items-center centers each row (including a shorter last row) as
                    a block, instead of a plain stacked list that would hug the left edge. */}
                <div className="flex flex-col items-center gap-2">
                  {rowNumbers.map((row) => {
                    const rowSeats = [...(seatsByRow[row] ?? [])].sort((a, b) =>
                      a.seatColumn.localeCompare(b.seatColumn)
                    );
                    return (
                      <div key={row} className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-center text-[10px] font-black text-[#af8782]/60">{row}</span>
                        <div className="flex flex-wrap justify-center gap-1">
                          {rowSeats.map((seat) => {
                            const cls = seat.booked ? "text-[#e50914]" : "text-[#af8782]";
                            return (
                              <div
                                key={seat.seatId}
                                title={`Ghế ${seat.seatColumn}${seat.seatRow} — ${seat.booked ? "Đã đặt" : "Còn trống"}`}
                                className={`group relative flex h-8 w-9 cursor-default items-center justify-center ${cls}`}
                              >
                                <SeatIcon className="h-full w-full" />
                                <span className={`pointer-events-none absolute inset-0 flex items-center justify-center pt-0.5 text-[9px] font-black ${seat.booked ? "text-white" : "text-[#141414]"}`}>
                                  {seat.seatColumn}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <span className="w-4 shrink-0 text-center text-[10px] font-black text-[#af8782]/60">{row}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] font-bold uppercase text-[#e9bcb6]/70">
                  <SeatLegendItem colorClass="text-[#af8782]" label="Còn Trống" />
                  <SeatLegendItem colorClass="text-[#e50914]" label="Đã Đặt" />
                </div>
              </>
            )}
          </div>
        </ModalShell>
      )}

      {/* ── DELETE CONFIRMATION ── */}
      <ConfirmDialog
        open={deleteRoom !== null}
        title="Xóa phòng chiếu"
        message={
          <>
            Xóa phòng chiếu <b className="text-white">"{deleteRoom?.cinemaRoomName}"</b>?
            <br />
            Phòng sẽ bị ẩn khỏi danh sách nhưng dữ liệu (lịch chiếu, ghế đã đặt) vẫn được giữ nguyên.
          </>
        }
        confirmLabel="Xóa phòng"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRoom(null)}
      />
    </>
  );
}

// Same cinema-seat silhouette as the staff & customer seat maps, so admin sees the same seat map style.
function SeatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5V14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" />
      <rect x="1.5" y="11" width="3" height="7" rx="1.5" />
      <rect x="19.5" y="11" width="3" height="7" rx="1.5" />
    </svg>
  );
}
function SeatLegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <SeatIcon className={`h-4 w-4 ${colorClass}`} />
      {label}
    </span>
  );
}
