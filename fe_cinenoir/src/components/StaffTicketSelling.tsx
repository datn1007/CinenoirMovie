import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AlertCircle, Calendar, CheckCircle2, Clock3, Camera, DoorOpen, Loader2, QrCode, Ticket, UserRound } from "lucide-react";
import { Movie, Schedule, ScheduleSeatAvailability } from "../types";

import { API_BASE_URL as API_BASE } from "../lib/apiConfig";
import { formatDate as sharedFormatDate, isPastSchedule } from "../lib/formatDate";
const token = () => localStorage.getItem("cinenoir_jwt_token") ?? "";
const headers = () => ({ Authorization: `Bearer ${token()}` });
const jsonHeaders = () => ({ "Content-Type": "application/json", ...headers() });

interface MemberOption {
  memberId: string;
  accountId: string;
  fullName: string;
  phoneNumber: string;
  score: number;
}

interface TicketResponse {
  invoiceId: string;
  movieName: string;
  showDate: string;
  showTime: string;
  seats: string;
  totalAmount: number;
}

interface CheckinResult {
  invoiceId: string;
  movieName: string;
  showDate: string;
  showTime: string;
  seats: string;
  totalMoney: number;
  checkinStatus: number | null;
  checkinTime: string | null;
}

export default function StaffTicketSelling() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [seats, setSeats] = useState<ScheduleSeatAvailability[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<MemberOption[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [useScore, setUseScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [seatLoading, setSeatLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [lastTicket, setLastTicket] = useState<TicketResponse | null>(null);

  const [activeTab, setActiveTab] = useState<"sell" | "checkin">("sell");
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);
  const [checkinError, setCheckinError] = useState("");
  const [scannerActive, setScannerActive] = useState(false);

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.scheduleId === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId]
  );

  const groupedSeats = useMemo(() =>
    seats.reduce<Record<string, ScheduleSeatAvailability[]>>((acc, seat) => {
      const row = seat.seatCode.charAt(0);
      acc[row] = [...(acc[row] ?? []), seat];
      return acc;
    }, {}),
    [seats]
  );

  const totalAmount = selectedSeats.reduce((sum, seatCode) => {
    const seat = seats.find((s) => s.seatCode === seatCode);
    return sum + (seat?.seatType === 2 ? 150000 : 100000);
  }, 0);

  const maxScore = Math.min(selectedMember?.score ?? 0, totalAmount);
  const payableAmount = Math.max(totalAmount - useScore, 0);

  useEffect(() => { loadMovies(); }, []);

  // Tìm hội viên theo tên/SĐT/email khi gõ, có debounce để không gọi API liên tục.
  useEffect(() => {
    if (!memberQuery.trim()) { setMemberResults([]); return; }
    setMemberSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/members/search?keyword=${encodeURIComponent(memberQuery.trim())}`, { headers: headers() });
        setMemberResults(res.ok ? await res.json() : []);
      } catch {
        setMemberResults([]);
      } finally {
        setMemberSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [memberQuery]);

  useEffect(() => {
    if (!selectedMovieId) { setSchedules([]); setSelectedScheduleId(null); return; }
    loadSchedules(selectedMovieId);
  }, [selectedMovieId]);

  useEffect(() => {
    if (!selectedSchedule) { setSeats([]); setSelectedSeats([]); return; }
    loadSeats(selectedSchedule.showtimeId ?? selectedSchedule.scheduleId);
  }, [selectedSchedule?.scheduleId]);

  useEffect(() => {
    setUseScore((s) => Math.min(s, maxScore));
  }, [maxScore]);

  const showToast = (message: string, ok = false) => {
    setToast({ message, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/movies`, { headers: headers() });
      if (!res.ok) throw new Error("Không thể tải danh sách phim.");
      const data: Movie[] = await res.json();
      setMovies(data);
      setSelectedMovieId((cur) => cur || data[0]?.id || "");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async (movieId: string) => {
    setLoading(true);
    setSchedules([]);
    setSelectedScheduleId(null);
    setSeats([]);
    setSelectedSeats([]);
    try {
      const res = await fetch(`${API_BASE}/api/schedules/movie/${encodeURIComponent(movieId)}`, { headers: headers() });
      if (!res.ok) throw new Error("Không thể tải suất chiếu.");
      const data: Schedule[] = await res.json();
      const active = data.filter((s) => s.status !== 0 && s.statusLabel !== "PAUSED");
      setSchedules(active);
      // Mặc định chọn suất chưa qua giờ chiếu nếu có, tránh bán vé nhầm cho suất đã chiếu xong.
      const firstUpcoming = active.find((s) => !isPastSchedule(s.showDate, s.scheduleTime));
      setSelectedScheduleId((firstUpcoming ?? active[0])?.scheduleId ?? null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const loadSeats = async (showtimeId: number) => {
    setSeatLoading(true);
    setSelectedSeats([]);
    try {
      const res = await fetch(`${API_BASE}/api/showtimes/${showtimeId}/seats`, { headers: headers() });
      if (!res.ok) throw new Error("Không thể tải sơ đồ ghế.");
      setSeats(await res.json());
    } catch (err) {
      setSeats([]);
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi.");
    } finally {
      setSeatLoading(false);
    }
  };

  const sellTicket = async () => {
    if (!selectedMovieId) return showToast("Vui lòng chọn phim.");
    if (!selectedSchedule) return showToast("Vui lòng chọn suất chiếu.");
    if (isPastSchedule(selectedSchedule.showDate, selectedSchedule.scheduleTime)) {
      return showToast("Suất chiếu này đã qua giờ chiếu. Vui lòng chọn suất khác.");
    }
    if (selectedSeats.length === 0) return showToast("Vui lòng chọn ghế.");

    setSelling(true);
    try {
      const showtimeId = selectedSchedule.showtimeId ?? selectedSchedule.scheduleId;
      const res = await fetch(`${API_BASE}/api/ticket-selling`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          movieId: selectedMovieId,
          scheduleId: selectedSchedule.scheduleId,
          showtimeId,
          memberId: selectedMember?.memberId ?? null,
          accountId: selectedMember?.accountId ?? null,
          selectedSeats,
          useScore,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Không thể bán vé.");
      const data: TicketResponse = await res.json();
      setLastTicket(data);
      setSelectedSeats([]);
      setUseScore(0);
      showToast("Bán vé thành công!", true);
      await loadSeats(showtimeId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi khi bán vé.");
    } finally {
      setSelling(false);
    }
  };

  const submitCheckin = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    if (!/^[A-Z0-9-]{5,}$/.test(code)) {
      setCheckinError("Mã vé không hợp lệ (chỉ gồm chữ, số, dấu gạch ngang, tối thiểu 5 ký tự).");
      return;
    }
    setCheckinLoading(true);
    setCheckinError("");
    setCheckinResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${encodeURIComponent(code)}/checkin`, {
        method: "POST",
        headers: headers(),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Check-in thất bại.");
      const data: CheckinResult = JSON.parse(text);
      setCheckinResult(data);
      showToast(`Check-in thành công: ${data.movieName}`, true);
    } catch (err) {
      setCheckinError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi check-in.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const toggleSeat = (seat: ScheduleSeatAvailability) => {
    if (seat.booked) return;
    setSelectedSeats((cur) =>
      cur.includes(seat.seatCode)
        ? cur.filter((s) => s !== seat.seatCode)
        : [...cur, seat.seatCode]
    );
  };

  return (
    <div className="space-y-7 animate-fade-in text-[#e5e2e1]">
      {toast && (
        <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-2xl ${toast.ok ? "border-green-700/40 bg-[#0d2b0d] text-green-300" : "border-red-700/40 bg-[#2b0d0d] text-red-300"}`}>
          {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <header className="flex flex-col gap-4 border-b border-[#332220]/40 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">{activeTab === "sell" ? "Bán Vé" : "Check-in Vé"}</h2>
          <p className="mt-1 text-xs text-[#e9bcb6]/75">
            {activeTab === "sell"
              ? "Chọn phim, suất chiếu, ghế và hội viên để hoàn tất bán vé."
              : "Quét mã QR trên vé hoặc nhập mã vé để xác thực khách vào rạp."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#5e3f3b]/45 p-1">
            <button
              onClick={() => setActiveTab("sell")}
              className={`rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${activeTab === "sell" ? "bg-[#e50914] text-white" : "text-[#e9bcb6]/70 hover:text-white"}`}
            >
              Bán Vé
            </button>
            <button
              onClick={() => setActiveTab("checkin")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${activeTab === "checkin" ? "bg-[#e50914] text-white" : "text-[#e9bcb6]/70 hover:text-white"}`}
            >
              <QrCode className="h-3.5 w-3.5" /> Check-in Vé
            </button>
          </div>
          {activeTab === "sell" && (
            <button
              onClick={() => selectedSchedule && loadSeats(selectedSchedule.showtimeId ?? selectedSchedule.scheduleId)}
              className="flex h-10 items-center gap-2 rounded-lg border border-[#5e3f3b]/45 px-4 text-xs font-bold text-[#e9bcb6] hover:border-[#ffb4aa]/60"
            >
              <Ticket className="h-4 w-4" /> Tải lại ghế
            </button>
          )}
        </div>
      </header>

      {activeTab === "checkin" && (
        <CheckinPanel
          code={checkinCode}
          onCodeChange={setCheckinCode}
          onSubmit={() => submitCheckin(checkinCode)}
          loading={checkinLoading}
          result={checkinResult}
          error={checkinError}
          scannerActive={scannerActive}
          onToggleScanner={() => setScannerActive((v) => !v)}
          onScanned={(code) => { setCheckinCode(code); setScannerActive(false); submitCheckin(code); }}
        />
      )}

      {activeTab === "sell" && (
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: movie + schedule + member */}
        <div className="space-y-5 xl:col-span-4">
          <Panel title="Thông tin suất chiếu">
            <Field label="Phim">
              <select value={selectedMovieId} onChange={(e) => setSelectedMovieId(e.target.value)} className={inputClass}>
                {loading && <option>Đang tải...</option>}
                {movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </Field>
            <Field label="Suất chiếu">
              <select value={selectedScheduleId ?? ""} onChange={(e) => setSelectedScheduleId(Number(e.target.value))} className={inputClass}>
                {schedules.length === 0 && <option value="">Chưa có suất chiếu</option>}
                {schedules.map((s) => {
                  const past = isPastSchedule(s.showDate, s.scheduleTime);
                  return (
                    <option key={s.scheduleId} value={s.scheduleId} disabled={past}>
                      {formatDate(s.showDate)} — {s.scheduleTime} — {s.cinemaRoomName ?? `Phòng #${s.cinemaRoomId}`}
                      {past ? " (đã qua)" : ""}
                    </option>
                  );
                })}
              </select>
            </Field>
            {selectedSchedule && (
              <div className="grid grid-cols-3 gap-2 text-[11px] text-[#e9bcb6]/80">
                <MiniInfo icon={<Calendar className="h-3.5 w-3.5" />} label="Ngày" value={formatDate(selectedSchedule.showDate)} />
                <MiniInfo icon={<Clock3 className="h-3.5 w-3.5" />} label="Giờ" value={selectedSchedule.scheduleTime} />
                <MiniInfo icon={<DoorOpen className="h-3.5 w-3.5" />} label="Phòng" value={selectedSchedule.cinemaRoomName ?? "--"} />
              </div>
            )}
          </Panel>

          <Panel title="Hội Viên">
            {selectedMember ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#5e3f3b]/35 bg-[#131313] px-3 py-2.5">
                <UserRound className="h-5 w-5 text-[#ffb4aa] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{selectedMember.fullName}</p>
                  <p className="text-[10px] text-[#e9bcb6]/60">{selectedMember.phoneNumber} · {selectedMember.score ?? 0} điểm tích lũy</p>
                </div>
                <button type="button"
                  onClick={() => { setSelectedMember(null); setUseScore(0); setMemberQuery(""); }}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#ffb4aa]/70 hover:text-[#ffb4aa] hover:underline underline-offset-2"
                >
                  Đổi
                </button>
              </div>
            ) : (
              <Field label="Tìm hội viên">
                <div className="relative">
                  <input
                    value={memberQuery}
                    onChange={(e) => { setMemberQuery(e.target.value); setMemberDropdownOpen(true); }}
                    onFocus={() => setMemberDropdownOpen(true)}
                    onBlur={() => window.setTimeout(() => setMemberDropdownOpen(false), 150)}
                    placeholder="Tìm theo tên, SĐT hoặc email..."
                    className={inputClass}
                  />
                  {memberDropdownOpen && memberQuery.trim() && (
                    <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#5e3f3b]/45 bg-[#1a1a1a] shadow-xl">
                      {memberSearching ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#af8782]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tìm...
                        </div>
                      ) : memberResults.length === 0 ? (
                        <div className="px-3 py-2.5 text-xs text-[#af8782]">Không tìm thấy hội viên phù hợp.</div>
                      ) : (
                        memberResults.map((m) => (
                          <button key={m.accountId} type="button"
                            onClick={() => { setSelectedMember(m); setUseScore(0); setMemberDropdownOpen(false); setMemberQuery(""); }}
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-white/[0.04]"
                          >
                            <span className="text-xs font-bold text-white">{m.fullName}</span>
                            <span className="text-[10px] text-[#af8782]">{m.phoneNumber}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[#af8782]/50">Để trống nếu là khách vãng lai.</p>
              </Field>
            )}
          </Panel>
        </div>

        {/* Center: seat map */}
        <div className="xl:col-span-5">
          <Panel title="Sơ đồ ghế">
            {seatLoading ? (
              <Loading />
            ) : seats.length === 0 ? (
              <Empty text="Chưa có dữ liệu ghế cho suất chiếu." />
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="mx-auto mb-6 h-2 w-10/12 rounded-full bg-[#e50914]/35 shadow-[0_-10px_35px_rgba(229,9,20,0.45)]" />
                <p className="mb-5 text-center text-[10px] font-black uppercase tracking-[0.4em] text-[#e9bcb6]/65">Màn hình</p>
                <div className="flex min-w-max flex-col items-center gap-2">
                  {Object.keys(groupedSeats).sort().map((row) => (
                    <div key={row} className="flex items-center gap-2">
                      <span className="w-4 text-center text-[10px] font-black text-[#af8782]/60">{row}</span>
                      {[...groupedSeats[row]]
                        .sort((a, b) => Number(a.seatCode.slice(1)) - Number(b.seatCode.slice(1)))
                        .map((seat) => {
                          const active = selectedSeats.includes(seat.seatCode);
                          const cls = seat.booked
                            ? "text-[#353534] cursor-not-allowed"
                            : active
                            ? "text-[#e50914]"
                            : "text-[#af8782] hover:text-white";
                          return (
                            <button key={seat.seatCode} disabled={seat.booked} onClick={() => toggleSeat(seat)} title={seat.seatCode}
                              className={`group relative flex h-9 w-10 items-center justify-center transition-colors ${cls}`}>
                              <SeatIcon className="h-full w-full" />
                              <span className={`pointer-events-none absolute inset-0 flex items-center justify-center pt-0.5 text-[9px] font-black ${active ? "text-white" : seat.booked ? "text-[#1a1a1a]" : "text-[#141414]"}`}>
                                {seat.seatCode.slice(1)}
                              </span>
                            </button>
                          );
                        })}
                      <span className="w-4 text-center text-[10px] font-black text-[#af8782]/60">{row}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-center gap-5 text-[10px] text-[#e9bcb6]/60">
                  <SeatLegendItem colorClass="text-[#af8782]" label="Thường" />
                  <SeatLegendItem colorClass="text-[#e50914]" label="Đang chọn" />
                  <SeatLegendItem colorClass="text-[#353534]" label="Đã đặt" />
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Right: payment */}
        <div className="space-y-5 xl:col-span-3">
          <Panel title="Thanh toán">
            <SummaryLine label="Ghế đã chọn" value={selectedSeats.length ? selectedSeats.join(", ") : "Chưa chọn"} />
            <SummaryLine label="Tiền vé" value={formatMoney(totalAmount)} />
            <Field label={`Dùng điểm${selectedMember ? ` (tối đa ${maxScore})` : " (cần chọn hội viên)"}`}>
              <input
                type="number" min={0} max={maxScore} value={useScore}
                disabled={!selectedMember}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  setUseScore(Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), maxScore) : 0);
                }}
                className={inputClass}
              />
            </Field>
            <SummaryLine label="Cần thanh toán" value={formatMoney(payableAmount)} strong />
            <button
              disabled={selling || selectedSeats.length === 0}
              onClick={sellTicket}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#e50914] text-xs font-black uppercase text-white shadow-[0_4px_14px_rgba(229,9,20,0.3)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {selling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Bán vé
            </button>
          </Panel>

          {lastTicket && (
            <Panel title="Vé vừa bán">
              <SummaryLine label="Mã vé" value={lastTicket.invoiceId} />
              <SummaryLine label="Phim" value={lastTicket.movieName} />
              <SummaryLine label="Suất" value={`${formatDate(lastTicket.showDate)} ${lastTicket.showTime}`} />
              <SummaryLine label="Ghế" value={lastTicket.seats} />
              <SummaryLine label="Tổng tiền" value={formatMoney(lastTicket.totalAmount)} strong />
            </Panel>
          )}
        </div>
      </section>
      )}
    </div>
  );
}

const inputClass = "h-10 w-full rounded-lg border border-[#5e3f3b]/45 bg-[#131313] px-3 text-xs text-[#e5e2e1] placeholder:text-[#af8782]/45 focus:border-[#ffb4aa]/70 focus:outline-none";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-5">
      <h3 className="mb-4 text-sm font-black text-white">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#af8782]/85">{label}</span>
      {children}
    </label>
  );
}

function MiniInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#5e3f3b]/30 bg-[#131313] p-2">
      <div className="mb-1 flex items-center gap-1 text-[#ffb4aa]">{icon}<span className="text-[9px] uppercase">{label}</span></div>
      <p className="truncate font-bold text-white">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#5e3f3b]/10 pb-2 text-xs">
      <span className="text-[#e9bcb6]/75">{label}</span>
      <span className={strong ? "text-base font-black text-[#ffb4aa]" : "font-bold text-white"}>{value}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-xs text-[#af8782]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#ffb4aa]" />Đang tải dữ liệu...
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-[#5e3f3b]/40 px-4 py-12 text-center text-xs text-[#af8782]">{text}</div>;
}

// Same cinema-seat silhouette as the customer booking flow, so staff see the same seat map style.
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

function formatDate(value?: string) {
  return sharedFormatDate(value, "--");
}

function formatMoney(value?: number) {
  return `${(value ?? 0).toLocaleString("vi-VN")} ₫`;
}

function CheckinPanel({
  code, onCodeChange, onSubmit, loading, result, error, scannerActive, onToggleScanner, onScanned,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  result: CheckinResult | null;
  error: string;
  scannerActive: boolean;
  onToggleScanner: () => void;
  onScanned: (code: string) => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="Quét mã QR">
        <button
          type="button"
          onClick={onToggleScanner}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#5e3f3b]/45 text-xs font-black uppercase text-[#e9bcb6] hover:border-[#ffb4aa]/60"
        >
          <Camera className="h-4 w-4" />
          {scannerActive ? "Tắt camera" : "Bật camera quét QR"}
        </button>

        {scannerActive && <QrScanner onScanned={onScanned} />}

        <div className="border-t border-[#5e3f3b]/25 pt-4">
          <Field label="Hoặc nhập mã vé thủ công">
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
                placeholder="VD: BK1A2B3C4D"
                className={inputClass}
              />
              <button
                type="button"
                disabled={loading || !code.trim()}
                onClick={onSubmit}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#e50914] px-4 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Check-in
              </button>
            </div>
          </Field>
        </div>
      </Panel>

      <Panel title="Kết quả">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {result ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Check-in thành công lúc {result.checkinTime ?? "--"}</span>
            </div>
            <SummaryLine label="Mã vé" value={result.invoiceId} />
            <SummaryLine label="Phim" value={result.movieName} />
            <SummaryLine label="Suất" value={`${formatDate(result.showDate)} ${result.showTime}`} />
            <SummaryLine label="Ghế" value={result.seats} />
            <SummaryLine label="Tổng tiền" value={formatMoney(result.totalMoney)} strong />
          </>
        ) : (
          !error && <Empty text="Chưa có vé nào được quét." />
        )}
      </Panel>
    </section>
  );
}

function QrScanner({ onScanned }: { onScanned: (code: string) => void }) {
  const containerId = "staff-checkin-qr-reader";
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let cancelled = false;
    // React StrictMode runs this effect twice in dev (mount → cleanup → mount).
    // Html5Qrcode.start() is async, so the first instance's cleanup can fire before
    // its camera has actually attached — clearing the container here, and stopping
    // the first instance's video the moment its start() resolves if by then we've
    // been cancelled, keeps only a single camera box on screen instead of two.
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          if (!cancelled) onScanned(decodedText);
        },
        () => {}
      )
      .then(() => {
        if (cancelled) scanner.stop().then(() => scanner.clear()).catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) setScanError(err instanceof Error ? err.message : "Không thể mở camera. Kiểm tra quyền truy cập camera.");
      });

    return () => {
      cancelled = true;
      const current = scannerRef.current;
      if (current && current.isScanning) {
        current.stop().then(() => current.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="mt-3">
      <div id={containerId} className="mx-auto max-w-xs overflow-hidden rounded-lg" />
      {scanError && <p className="mt-2 text-center text-[11px] text-red-400">{scanError}</p>}
    </div>
  );
}
