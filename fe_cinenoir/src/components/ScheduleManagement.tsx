import React, { useEffect, useMemo, useState } from "react";
import { CinemaRoom, Movie, Schedule } from "../types";
import {
  CalendarClock,
  Clock3,
  DoorOpen,
  Film,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence } from "motion/react";

import { API_BASE_URL as API_BASE } from "../lib/apiConfig";
import { formatDate as sharedFormatDate } from "../lib/formatDate";
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
  inputClass,
} from "./admin/AdminUI";
const jwt = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

const labelClass = "block text-[10px] font-black uppercase tracking-widest text-[#af8782]/85 mb-1.5";
const helperClass = "mt-1 text-[10px] leading-relaxed text-[#af8782]/60";

type ModalMode = "create" | "edit" | null;

type FormState = {
  movieId: string;
  showDate: string;
  scheduleTime: string;
  cinemaRoomId: string;
  status: "1" | "0";
  note: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  movieId: "",
  showDate: "",
  scheduleTime: "",
  cinemaRoomId: "",
  status: "1",
  note: "",
};

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [rooms, setRooms] = useState<CinemaRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.id === form.movieId) ?? null,
    [movies, form.movieId]
  );

  const showToast = (msg: string, ok = false) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const authHeaders = () => ({ Authorization: `Bearer ${jwt()}` });

  const loadData = async () => {
    setLoading(true);
    try {
      const [scheduleRes, movieRes, roomRes] = await Promise.all([
        fetch(`${API_BASE}/api/schedules`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/movies`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/cinema-rooms`, { headers: authHeaders() }),
      ]);

      if (!scheduleRes.ok) throw new Error("Không thể tải danh sách lịch chiếu.");
      if (!movieRes.ok) throw new Error("Không thể tải danh sách phim.");
      if (!roomRes.ok) throw new Error("Không thể tải danh sách phòng chiếu.");

      const scheduleData: Schedule[] = await scheduleRes.json();
      const movieData: Movie[] = await movieRes.json();
      const roomData: CinemaRoom[] = await roomRes.json();

      setSchedules([...scheduleData].sort(compareSchedule));
      setMovies(movieData);
      setRooms(roomData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSchedules = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return schedules;
    return schedules.filter((schedule) =>
      schedule.scheduleId.toString().includes(keyword) ||
      (schedule.movieTitle ?? "").toLowerCase().includes(keyword) ||
      (schedule.movieId ?? "").toLowerCase().includes(keyword) ||
      (schedule.showDate ?? "").includes(keyword) ||
      schedule.scheduleTime.toLowerCase().includes(keyword) ||
      (schedule.cinemaRoomName ?? "").toLowerCase().includes(keyword)
    );
  }, [schedules, search]);

  const openCreate = () => {
    setEditingSchedule(null);
    setErrors({});
    setForm({
      ...emptyForm,
      movieId: movies[0]?.id ?? "",
      cinemaRoomId: rooms[0]?.cinemaRoomId?.toString() ?? "",
    });
    setModalMode("create");
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setErrors({});
    setForm({
      movieId: schedule.movieId ?? "",
      showDate: schedule.showDate ?? "",
      scheduleTime: schedule.scheduleTime,
      cinemaRoomId: schedule.cinemaRoomId?.toString() ?? "",
      status: schedule.status === 0 ? "0" : "1",
      note: schedule.note ?? "",
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingSchedule(null);
    setForm(emptyForm);
    setErrors({});
  };

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const time = form.scheduleTime.trim();
    const today = toDateOnly(new Date());

    if (!form.movieId) nextErrors.movieId = "Vui lòng chọn phim.";
    if (!form.cinemaRoomId) nextErrors.cinemaRoomId = "Vui lòng chọn phòng chiếu.";
    if (!form.showDate) {
      nextErrors.showDate = "Vui lòng chọn ngày chiếu.";
    } else if (form.showDate < today) {
      nextErrors.showDate = "Ngày chiếu không được nhỏ hơn ngày hiện tại.";
    }
    if (!time) {
      nextErrors.scheduleTime = "Vui lòng nhập giờ chiếu.";
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      nextErrors.scheduleTime = "Giờ chiếu không hợp lệ.";
    }

    const duplicate = schedules.some((schedule) =>
      schedule.scheduleId !== editingSchedule?.scheduleId &&
      schedule.showDate === form.showDate &&
      schedule.scheduleTime === time &&
      String(schedule.cinemaRoomId ?? "") === form.cinemaRoomId
    );
    if (duplicate) nextErrors.scheduleTime = "Suất chiếu này đã tồn tại.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizeError = (message: string) => {
    if (message.includes("past")) return "Ngày chiếu không được nhỏ hơn ngày hiện tại.";
    if (message.includes("already has a schedule")) return "Suất chiếu này đã tồn tại.";
    if (message.includes("tickets already exist")) return "Không thể sửa hoặc xóa suất chiếu đã có vé.";
    if (message.includes("invalid") || message.includes("required")) return "Dữ liệu không hợp lệ.";
    return message || "Đã xảy ra lỗi.";
  };

  const saveSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    const isEdit = modalMode === "edit" && editingSchedule;
    try {
      const payload = {
        movieId: form.movieId,
        showDate: form.showDate,
        scheduleTime: form.scheduleTime.trim(),
        cinemaRoomId: Number(form.cinemaRoomId),
        status: Number(form.status),
        note: form.note.trim() || undefined,
      };

      const res = await fetch(
        isEdit ? `${API_BASE}/api/schedules/${editingSchedule.scheduleId}` : `${API_BASE}/api/schedules`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(normalizeError(text));
      }

      const saved: Schedule = await res.json();
      showToast(isEdit ? "Sửa suất chiếu thành công." : "Thêm suất chiếu thành công.", true);
      closeModal();
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : isEdit ? "Không thể sửa suất chiếu." : "Không thể thêm suất chiếu.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (schedule: Schedule) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa suất chiếu #${schedule.scheduleId}?\nKhông thể xóa suất chiếu đã có vé.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/schedules/${schedule.scheduleId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        throw new Error(normalizeError(text));
      }

      showToast("Xóa suất chiếu thành công.", true);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể xóa suất chiếu.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#e5e2e1]">
      <AnimatePresence>{toast && <Toast message={toast.msg} ok={toast.ok} />}</AnimatePresence>

      <PageHeader
        title="Quản lý lịch chiếu"
        subtitle="Một suất chiếu bao gồm phim, ngày chiếu, giờ chiếu và phòng chiếu."
        actions={
          <>
            <RefreshButton onClick={loadData} loading={loading} />
            <PrimaryButton icon={Plus} onClick={openCreate}>
              Thêm suất chiếu
            </PrimaryButton>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CalendarClock} label="Tổng suất chiếu" value={schedules.length} tone="red" />
        <StatCard icon={Film} label="Tổng số phim" value={movies.length} tone="blue" />
        <StatCard icon={DoorOpen} label="Phòng chiếu" value={rooms.length} tone="gold" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] shadow-xl">
        <div className="flex flex-col gap-3 border-b border-[#5e3f3b]/25 bg-white/[0.02] p-5 md:flex-row md:items-center md:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo phim, ngày chiếu, giờ chiếu hoặc phòng chiếu"
            className="w-full md:max-w-md"
          />
          <p className="text-[11px] font-semibold text-[#af8782]/70">
            {loading ? "Đang tải dữ liệu..." : `${filteredSchedules.length} suất chiếu`}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#5e3f3b]/30 bg-[#1a1919] font-semibold uppercase tracking-wider text-[#af8782]">
                <th className="p-4 pl-6">Mã</th>
                <th className="p-4">Phim</th>
                <th className="p-4">Ngày chiếu</th>
                <th className="p-4">Giờ chiếu</th>
                <th className="p-4">Phòng chiếu</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Tình trạng vé</th>
                <th className="p-4 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5e3f3b]/12 text-[#e5e2e1]">
              {loading ? (
                <SkeletonRows columns={8} />
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={CalendarClock}
                      title="Chưa có suất chiếu phù hợp."
                      message="Hãy thay đổi từ khóa tìm kiếm hoặc thêm suất chiếu mới."
                    />
                  </td>
                </tr>
              ) : filteredSchedules.map((schedule) => (
                <tr key={schedule.scheduleId} className="transition-colors duration-150 hover:bg-white/[0.03]">
                  <td className="p-4 pl-6 font-mono text-[#af8782]">#{schedule.scheduleId}</td>
                  <td className="p-4">
                    <div className="flex min-w-0 items-center gap-2 font-bold">
                      <Film className="h-4 w-4 shrink-0 text-[#ffb4aa]" />
                      <span className="truncate">{schedule.movieTitle ?? schedule.movieId ?? "Chưa có phim"}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-[#e9bcb6]/80">{formatDate(schedule.showDate)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-bold">
                      <Clock3 className="h-4 w-4 text-[#e9c349]" />
                      {schedule.scheduleTime}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-[#af8782]" />
                      <span>{schedule.cinemaRoomName ?? schedule.cinemaRoomId ?? "Chưa chọn phòng"}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge tone={schedule.status !== 0 ? "success" : "neutral"} dot>
                      {schedule.status !== 0 ? "Hoạt động" : "Tạm dừng"}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge tone={schedule.hasBookedSeats ? "error" : "success"} dot>
                      {schedule.hasBookedSeats ? "Đã có vé" : "Chưa có vé"}
                    </Badge>
                  </td>
                  <td className="p-4 pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <IconButton icon={Pencil} title="Chỉnh sửa suất chiếu" onClick={() => openEdit(schedule)} />
                      <IconButton icon={Trash2} title="Xóa suất chiếu" tone="danger" onClick={() => deleteSchedule(schedule)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalMode && (
        <ModalShell onClose={closeModal} maxWidth="max-w-3xl">
          <ModalHeader
            icon={CalendarClock}
            title={modalMode === "create" ? "Thêm suất chiếu" : "Chỉnh sửa suất chiếu"}
            subtitle="Điền đầy đủ thông tin để hệ thống xác định đúng suất chiếu."
            onClose={closeModal}
          />

          <form onSubmit={saveSchedule} className="space-y-5 px-6 py-5">
            {editingSchedule?.hasBookedSeats && (
              <div className="flex items-center gap-2 rounded-lg border border-[#e50914]/25 bg-[#e50914]/10 px-3 py-2 text-xs text-[#ffb4aa]">
                <CalendarClock className="h-4 w-4 shrink-0" /> Suất chiếu đã có vé. Hệ thống sẽ chặn thao tác sửa.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Phim" error={errors.movieId}>
                <select
                  required
                  value={form.movieId}
                  onChange={(e) => updateField("movieId", e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Chọn phim</option>
                  {movies.map((movie) => (
                    <option key={movie.id} value={movie.id}>{movie.title}</option>
                  ))}
                </select>
              </Field>

              <Field label="Phòng chiếu" error={errors.cinemaRoomId}>
                <select
                  required
                  value={form.cinemaRoomId}
                  onChange={(e) => updateField("cinemaRoomId", e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">Chọn phòng chiếu</option>
                  {rooms.map((room) => (
                    <option key={room.cinemaRoomId} value={room.cinemaRoomId}>
                      {room.cinemaRoomName} - {room.seatQuantity} ghế
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ngày chiếu" error={errors.showDate}>
                <input
                  required
                  type="date"
                  value={form.showDate}
                  min={toDateOnly(new Date())}
                  onChange={(e) => updateField("showDate", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Giờ chiếu" error={errors.scheduleTime}>
                <input
                  required
                  value={form.scheduleTime}
                  onChange={(e) => updateField("scheduleTime", e.target.value)}
                  placeholder="Ví dụ: 19:30"
                  className={inputClass}
                />
              </Field>

              <Field label="Thời lượng">
                <input
                  value={selectedMovie?.duration ? `${selectedMovie.duration} phút` : "Chọn phim để hiển thị thời lượng"}
                  readOnly
                  className={`${inputClass} cursor-not-allowed text-[#af8782]`}
                />
                <p className={helperClass}>Thời lượng được lấy theo phim đã chọn.</p>
              </Field>

              <Field label="Trạng thái">
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value as "1" | "0")}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="1">Hoạt động</option>
                  <option value="0">Tạm dừng</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Ghi chú" error={errors.note}>
                  <textarea
                    value={form.note}
                    onChange={(e) => updateField("note", e.target.value)}
                    placeholder="Nhập ghi chú nội bộ nếu cần"
                    maxLength={500}
                    className={`${inputClass} min-h-24 resize-none py-2 leading-relaxed`}
                  />
                  <p className={helperClass}>{form.note.length}/500 ký tự</p>
                </Field>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#5e3f3b]/20 pt-4 sm:flex-row sm:justify-end">
              <SecondaryButton type="button" onClick={closeModal}>
                Hủy
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Lưu suất chiếu
              </PrimaryButton>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

function compareSchedule(a: Schedule, b: Schedule) {
  return (a.showDate ?? "9999-12-31").localeCompare(b.showDate ?? "9999-12-31")
    || a.scheduleTime.localeCompare(b.scheduleTime)
    || a.scheduleId - b.scheduleId;
}

function formatDate(value?: string) {
  return sharedFormatDate(value, "Chưa chọn ngày");
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {error && <p className="mt-1 text-[10px] font-semibold text-[#ffb4aa]">{error}</p>}
    </div>
  );
}
