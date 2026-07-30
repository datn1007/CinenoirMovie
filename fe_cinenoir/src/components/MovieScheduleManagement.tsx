import React, { useState, useEffect } from "react";
import { Movie } from "../types";
import {
  Plus, Trash2, FileEdit,
  Film, Loader2, Link2, ImageIcon,
  CheckCircle, UploadCloud, FileVideo, X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";

import { API_BASE_URL as API_BASE } from "../lib/apiConfig";
import { formatDate } from "../lib/formatDate";
import { isDateRangeValid } from "../lib/validation";
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SearchInput,
  Badge,
  IconButton,
  EmptyState,
  SkeletonRows,
  Toast,
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "./admin/AdminUI";

type FormState = {
  id: string; title: string; titleEnglish: string;
  director: string; actor: string; version: string;
  duration: string; rating: string; fromDate: string; toDate: string;
  description: string; imageUrl: string; trailerUrl: string; movieUrl: string;
  cinemaRoomId: number | "";
};
const EMPTY: FormState = {
  id: "", title: "", titleEnglish: "", director: "", actor: "",
  version: "2D", duration: "", rating: "", fromDate: "", toDate: "",
  description: "", imageUrl: "", trailerUrl: "", movieUrl: "", cinemaRoomId: "",
};

// Mã phim không còn cho admin tự nhập — sinh tự động mỗi lần mở form tạo mới.
const generateMovieId = () => `M-${Math.floor(Math.random() * 9000) + 1000}`;

interface Props { onMoviesChange?: (m: Movie[]) => void; }

const img = (p?: string) => !p ? "" : p.startsWith("http") ? p : `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
const toBeDate = (s: string) => { if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}-${m}-${y}`; };

/* ─── compact class shortcuts ─── */
const INP  = "w-full px-3 py-1.5 bg-[#111010] border border-[#5e3f3b]/40 rounded-lg text-[13px] text-white placeholder:text-[#5e3f3b]/50 focus:outline-none focus:border-[#e50914]/55 focus:ring-2 focus:ring-[#e50914]/15 focus:bg-[#181616] transition-all duration-200";
const LBL  = "block text-[10px] font-black uppercase tracking-wider text-[#af8782]/75 mb-1";
const SECT = "text-[9px] font-black uppercase tracking-widest text-[#af8782]/55 border-b border-[#5e3f3b]/20 pb-1.5 mb-2.5 mt-3 first:mt-0";

export default function MovieScheduleManagement({ onMoviesChange }: Props) {
  const [movies, setMovies]       = useState<Movie[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showModal, setShow]      = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>({ ...EMPTY });
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const showToast = (msg: string, ok = false) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };
  const jwt = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/movies`);
      if (!r.ok) throw new Error();
      const d: Movie[] = await r.json();
      setMovies(d); onMoviesChange?.(d);
    } catch { showToast("Không thể tải danh sách phim"); }
    finally { setLoading(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.duration) return;
    const durationNum = parseInt(form.duration, 10);
    if (!Number.isInteger(durationNum) || durationNum <= 0 || durationNum > 600) {
      showToast("Thời lượng phải là số nguyên hợp lệ (1-600 phút).");
      return;
    }
    if (form.rating.trim()) {
      const ratingNum = parseFloat(form.rating);
      if (!Number.isFinite(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        showToast("Đánh giá phim phải là số từ 0 đến 5.");
        return;
      }
    }
    if (!isDateRangeValid(form.fromDate, form.toDate)) {
      showToast("Ngày khởi chiếu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      id: form.id, title: form.title.trim(),
      titleEnglish: form.titleEnglish.trim() || undefined,
      director: form.director.trim() || undefined,
      actor: form.actor.trim() || undefined,
      version: form.version || undefined,
      duration: parseInt(form.duration),
      rating: form.rating.trim() || undefined,
      fromDate: form.fromDate ? toBeDate(form.fromDate) : undefined,
      toDate: form.toDate ? toBeDate(form.toDate) : undefined,
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      trailerUrl: form.trailerUrl.trim() || undefined,
      movieUrl: form.movieUrl.trim() || undefined,
      // cinemaRoomId is intentionally not sent — it's now view-only here; room assignment happens in Lịch Chiếu.
    };
    try {
      const url = editId ? `${API_BASE}/api/movies/${editId}` : `${API_BASE}/api/movies`;
      const r = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${jwt()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const t = await r.text(); throw new Error(t || `HTTP ${r.status}`); }
      showToast(editId ? "Cập nhật phim thành công" : "Thêm phim thành công", true);
      await load(); close();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Lưu thất bại"); }
    finally { setSaving(false); }
  };

  const del = async (id: string, title: string) => {
    if (!confirm(`Xóa phim "${title}"?\nHành động này không thể hoàn tác.`)) return;
    try {
      const r = await fetch(`${API_BASE}/api/movies/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${jwt()}` },
      });
      if (!r.ok && r.status !== 204) throw new Error();
      showToast(`Đã xóa "${title}"`, true); await load();
    } catch { showToast("Xóa phim thất bại"); }
  };

  const openCreate = () => { setForm({ ...EMPTY, id: generateMovieId() }); setEditId(null); setShow(true); };
  const openEdit = (m: Movie) => {
    setEditId(m.id);
    setForm({
      id: m.id, title: m.title ?? "", titleEnglish: m.titleEnglish ?? "",
      director: m.director ?? "", actor: m.actor ?? "", version: m.version ?? "2D",
      duration: m.duration?.toString() ?? "", rating: m.rating ?? "", fromDate: m.fromDate ?? "", toDate: m.toDate ?? "",
      description: m.description ?? m.synopsis ?? "", imageUrl: m.imageUrl ?? "", trailerUrl: m.trailerUrl ?? "",
      movieUrl: m.movieUrl ?? "",
      cinemaRoomId: m.cinemaRoomId ?? "",
    });
    setShow(true);
  };
  const close = () => { setShow(false); setForm({ ...EMPTY }); setEditId(null); };

  const uploadMovieVideo = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".mp4")) {
      showToast("Chỉ chấp nhận file .mp4");
      return;
    }
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API_BASE}/api/upload/movie/video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt()}` },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Upload thất bại");
      setForm(f => ({ ...f, movieUrl: data.filePath }));
      showToast("Tải file phim lên thành công", true);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Tải file phim lên thất bại");
    } finally {
      setUploadingVideo(false);
    }
  };
  const movieFileName = (url: string) => url ? url.substring(url.lastIndexOf("/") + 1) : "";
  const fld = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const filtered = movies.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.titleEnglish?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">

      <AnimatePresence>{toast && <Toast message={toast.msg} ok={toast.ok} />}</AnimatePresence>

      {/* ── Header ── */}
      <PageHeader
        title="Danh Sách Phim"
        subtitle={loading ? "Đang tải..." : `${movies.length} phim trong hệ thống`}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm kiếm phim..." className="w-52" />
            <PrimaryButton icon={Plus} onClick={openCreate}>
              Thêm Phim Mới
            </PrimaryButton>
          </>
        }
      />

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-[#5e3f3b]/25 shadow-lg">
       <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#5e3f3b]/25 bg-[#1a1919]">
              <th className="w-24 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]/60">Mã Phim</th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]/60">Tên Phim</th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]/60 md:table-cell">Đạo Diễn</th>
              <th className="hidden w-28 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]/60 lg:table-cell">Thời Lượng</th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]/60 lg:table-cell">Ngày Chiếu</th>
              <th className="w-16 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]/60">Ver</th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#5e3f3b]/15">
            {loading ? (
              <SkeletonRows columns={7} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={Film}
                    title={search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có phim nào"}
                    message={!search ? "Nhấn “Thêm Phim Mới” để bắt đầu" : undefined}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((movie) => (
                <tr key={movie.id} className="transition-colors duration-150 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-[#af8782]/60">{movie.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate font-bold leading-tight text-[#e5e2e1]">{movie.title}</p>
                    {movie.titleEnglish && (
                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-[#af8782]/50">{movie.titleEnglish}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="block max-w-[160px] truncate text-[#e9bcb6]/60">{movie.director || "—"}</span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {movie.duration
                      ? <span className="text-[#e9bcb6]/70">{movie.duration} phút</span>
                      : <span className="text-[#af8782]/30">—</span>
                    }
                  </td>
                  <td className="hidden px-4 py-3 text-[12px] text-[#e9bcb6]/55 lg:table-cell">
                    {movie.fromDate
                      ? <>{formatDate(movie.fromDate)}{movie.toDate && <> → {formatDate(movie.toDate)}</>}</>
                      : <span className="text-[#af8782]/30">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {movie.version ? <Badge tone="error">{movie.version}</Badge> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <IconButton icon={FileEdit} title="Chỉnh sửa" onClick={() => openEdit(movie)} />
                      <IconButton icon={Trash2} title="Xóa" tone="danger" onClick={() => del(movie.id, movie.title)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
       </div>
      </div>

      {/* ═══════════════════ MODAL ═══════════════════ */}
      {showModal && (
        <ModalShell onClose={close} maxWidth="max-w-4xl">
          <ModalHeader
            icon={Film}
            title={editId ? "Chỉnh Sửa Thông Tin Phim" : "Thêm Phim Mới"}
            subtitle={editId ?? undefined}
            onClose={close}
          />

          {/* ── Body + Footer wrapped in form ── */}
          <form onSubmit={submit} className="flex flex-col">

            {/* ── Body: 2 columns ── */}
            <div className="grid grid-cols-1 divide-x-0 md:grid-cols-2 md:divide-x md:divide-[#5e3f3b]/15">

              {/* ════ LEFT ════ */}
              <div className="px-6 py-5">

                <p className={SECT}>Thông Tin Cơ Bản</p>

                <div className="mb-2.5">
                  <label className={LBL}>Tên Phim <span className="text-[#e50914]">*</span></label>
                  <input required value={form.title} onChange={fld("title")} placeholder="vd. Kẻ Cắp Mặt Trăng" className={INP} />
                </div>

                <div className="mb-2.5 grid grid-cols-3 gap-3">
                  <div>
                    <label className={LBL}>Phiên Bản</label>
                    <select value={form.version} onChange={fld("version")} className={`${INP} cursor-pointer`}>
                      <option>2D</option><option>3D</option><option>IMAX</option>
                      <option>VIP</option><option>2D IMAX</option><option>3D IMAX</option>
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Thời Lượng (phút) <span className="text-[#e50914]">*</span></label>
                    <input required type="number" min={1} value={form.duration} onChange={fld("duration")} placeholder="120" className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>Đánh Giá (0-5 sao)</label>
                    <input type="number" min={0} max={5} step={0.5} value={form.rating} onChange={fld("rating")} placeholder="4.5" className={INP} />
                  </div>
                </div>

                <p className={SECT}>Nhân Sự</p>

                <div className="mb-2.5">
                  <label className={LBL}>Đạo Diễn</label>
                  <input value={form.director} onChange={fld("director")} placeholder="vd. Christopher Nolan" className={INP} />
                </div>

                <div className="mb-2.5">
                  <label className={LBL}>Diễn Viên</label>
                  <input value={form.actor} onChange={fld("actor")} placeholder="vd. Tom Hanks, Cillian Murphy" className={INP} />
                </div>

                <p className={SECT}>Thời Gian Chiếu</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LBL}>Ngày Khởi Chiếu</label>
                    <input type="date" value={form.fromDate} onChange={fld("fromDate")} className={`${INP} [color-scheme:dark]`} />
                  </div>
                  <div>
                    <label className={LBL}>Ngày Kết Thúc</label>
                    <input type="date" value={form.toDate} onChange={fld("toDate")} className={`${INP} [color-scheme:dark]`} />
                  </div>
                </div>
              </div>

              {/* ════ RIGHT ════ */}
              <div className="flex flex-col px-6 py-5">

                <p className={SECT}>Hình Ảnh, Trailer &amp; File Phim</p>

                {/* Poster URL (S3) */}
                <div className="mb-3">
                  <label className={LBL}>URL Poster (S3)</label>
                  <div className="relative">
                    <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#af8782]/40" />
                    <input type="url" value={form.imageUrl} onChange={fld("imageUrl")}
                      placeholder="https://your-bucket.s3.amazonaws.com/posters/movie.jpg"
                      className={`${INP} pl-9`} />
                  </div>
                  {form.imageUrl && (
                    <div className="mt-2 h-28 w-full overflow-hidden rounded-lg border border-[#5e3f3b]/30 bg-[#111010]">
                      <img src={img(form.imageUrl)} alt="preview" className="h-full w-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = "0.15"; }} />
                    </div>
                  )}
                </div>

                {/* Trailer URL */}
                <div className="mb-3">
                  <label className={LBL}>URL Trailer (Cloud)</label>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#af8782]/40" />
                    <input type="url" value={form.trailerUrl} onChange={fld("trailerUrl")}
                      placeholder="https://your-bucket.s3.amazonaws.com/trailers/movie.mp4"
                      className={`${INP} pl-9`} />
                  </div>
                  {form.trailerUrl && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-green-400/65">
                      <CheckCircle className="h-3 w-3" /> Nút Trailer sẽ xuất hiện trên trang chi tiết phim
                    </p>
                  )}
                </div>

                {/* Movie video file (uploaded to server — not an S3 URL) */}
                <div className="mb-3">
                  <label className={LBL}>File Phim (Chiếu Online) — .mp4</label>
                  {form.movieUrl ? (
                    <div className="flex items-center gap-2 rounded-lg border border-[#5e3f3b]/40 bg-[#111010] px-3 py-2">
                      <FileVideo className="h-4 w-4 shrink-0 text-[#ffb4aa]" />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#e9bcb6]/80">{movieFileName(form.movieUrl)}</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, movieUrl: "" }))}
                        className="shrink-0 text-[#af8782]/60 hover:text-[#ffb4aa]" title="Bỏ file phim">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`${INP} flex cursor-pointer items-center justify-center gap-2 border-dashed py-4 text-[#af8782]/70 hover:border-[#ffb4aa]/50 hover:text-[#ffb4aa] ${uploadingVideo ? "pointer-events-none opacity-60" : ""}`}>
                      {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      <span className="text-[12px] font-bold">{uploadingVideo ? "Đang tải lên..." : "Chọn file .mp4 để tải lên"}</span>
                      <input type="file" accept="video/mp4,.mp4" className="hidden" disabled={uploadingVideo}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMovieVideo(f); e.target.value = ""; }} />
                    </label>
                  )}
                </div>

                <p className={SECT}>Nội Dung</p>

                {/* Description */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <label className={LBL}>Mô Tả Phim</label>
                  <textarea
                    value={form.description} onChange={fld("description")}
                    placeholder="Tóm tắt nội dung phim..."
                    className={`${INP} min-h-[100px] flex-1 resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <ModalFooter>
              <p className="mr-auto text-[10px] text-[#af8782]/35"><span className="text-[#e50914]">*</span> Trường bắt buộc</p>
              <SecondaryButton type="button" onClick={close}>Hủy</SecondaryButton>
              <PrimaryButton type="submit" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editId ? "Lưu Thay Đổi" : "Thêm Phim"}
              </PrimaryButton>
            </ModalFooter>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
