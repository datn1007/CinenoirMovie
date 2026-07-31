import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { Movie, Schedule, ScheduleSeatAvailability } from "../types";
import MovieDetailModal from "./MovieDetailModal";
import { AlertCircle, Armchair, ArrowLeft, ArrowRight, Calendar, Check, CheckCircle, Clock, CreditCard, DoorOpen, Download, FileText, Home, Loader2, Mail, Minus, Plus, Printer, QrCode, Receipt, ShieldCheck, Tag, TicketPercent, User, Video, X, MonitorPlay, Ticket, CircleAlert, RotateCcw, Laptop } from "lucide-react";

import { API_BASE_URL as API_BASE } from "../lib/apiConfig";
import { formatDate as sharedFormatDate, isPastSchedule } from "../lib/formatDate";
import { isBlank, isNameLike, isValidEmail } from "../lib/validation";
import { ROUTES } from "../constants/routes";

interface BookingProps {
  movies: Movie[];
  initialSelectedMovie?: Movie | null;
  currentUser?: { fullName?: string; email?: string; accountId?: string } | null;
  onBookingComplete?: () => void;
  onWatchMovie?: (movie: Movie) => void;
  cinemaRooms?: unknown[];
  /** Set when this page was reached via PayOS's returnUrl/cancelUrl redirect. */
  payosMode?: "return" | "cancel" | null;
  payosOrderCode?: string | null;
}

interface TicketResponse {
  invoiceId: string;
  showtimeId?: number;
  movieName: string;
  showDate: string;
  showTime: string;
  seats: string;
  bookedSeats?: string[];
  status?: string;
  totalAmount: number;
}

interface ConcessionItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

const comboImageUrl = "/combo-popcorn-coke.png";

const concessionItems: ConcessionItem[] = [
  {
    id: "combo-standard",
    name: "Combo Standard",
    description: "Bắp nhỏ + Coca",
    price: 49000,
    imageUrl: comboImageUrl,
  },
  {
    id: "combo-couple",
    name: "Combo Couple",
    description: "Bắp lớn + 2 Coca",
    price: 79000,
    imageUrl: comboImageUrl,
  },
  {
    id: "combo-family",
    name: "Combo Family",
    description: "2 Bắp + 4 Coca",
    price: 149000,
    imageUrl: comboImageUrl,
  },
];

const mockPayment = {
  invoiceId: "INV-MOCK-001",
  ticketCode: "CNR-MOCK-001",
};

const PAYOS_PENDING_KEY = "cinenoir_pending_payos_checkout";

/** Display-only snapshot stashed before navigating to PayOS's hosted checkout page — nothing
 *  sensitive, just enough to rehydrate the confirmation/ticket UI after the round trip (the
 *  full-page redirect wipes all React state). */
interface PendingPayOSCheckout {
  orderCode: number;
  invoiceId: string;
  movieId: string;
  ticketMode: "THEATER" | "ONLINE";
  selectedSeats: string[];
  onlineQuantity: number;
  customerName: string;
  customerEmail: string;
  showDate?: string;
  showTime?: string;
  scheduleId?: number | null;
  selectedConcessions: Record<string, number>;
  appliedVoucher: { code: string; discountType: string; discountAmount: number; finalAmount: number } | null;
}

const authHeaders = () => {
  const token = localStorage.getItem("cinenoir_jwt_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value?: string) => sharedFormatDate(value, "Chưa chọn");

const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const uniq = <T,>(items: T[]) => Array.from(new Set(items));
const voucherPercent = (discountType?: string) => {
  const match = discountType?.match(/(\d+(?:\.\d+)?)\s*%?/);
  return match ? Number(match[1]) : null;
};


const HOLD_SECONDS = 300;
const ONLINE_TICKET_PRICE = 100000;

export default function BookingFlow({ movies, initialSelectedMovie, currentUser, onBookingComplete, onWatchMovie, payosMode, payosOrderCode }: BookingProps) {
  const holderId = currentUser?.accountId ?? "";
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [ticketMode, setTicketMode] = useState<"THEATER" | "ONLINE">("THEATER");
  const [onlineQuantity, setOnlineQuantity] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(initialSelectedMovie || movies[0] || null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [seats, setSeats] = useState<ScheduleSeatAvailability[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  // Điền sẵn từ tài khoản đã đăng nhập — khách vẫn có thể sửa lại trước khi xác nhận đặt vé.
  const [customerName, setCustomerName] = useState(currentUser?.fullName ?? "");
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email ?? "");
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string; discountType: string; discountAmount: number; finalAmount: number;
  } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [selectedConcessions, setSelectedConcessions] = useState<Record<string, number>>({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number | null>(null);
  const [errorText, setErrorText] = useState("");
  const [ticket, setTicket] = useState<TicketResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING_PAYMENT" | "PAID">("PENDING_PAYMENT");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showMovieGrid, setShowMovieGrid] = useState(!initialSelectedMovie);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [verifyingPayOS, setVerifyingPayOS] = useState(false);
  const pendingRestoreRef = useRef<PendingPayOSCheckout | null>(null);

  useEffect(() => {
    if (initialSelectedMovie) {
      setSelectedMovie(initialSelectedMovie);
      setShowMovieGrid(false);
    }
  }, [initialSelectedMovie]);

  useEffect(() => {
    if (!selectedMovie?.id) return;
    let cancelled = false;
    setLoadingSchedules(true);
    setErrorText("");
    setSchedules([]);
    setSelectedDate("");
    setSelectedTime("");
    setSelectedScheduleId(null);
    setSelectedSeats([]);
    setSeats([]);

    fetch(`${API_BASE}/api/schedules/movie/${encodeURIComponent(selectedMovie.id)}`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải lịch chiếu của phim này.");
        return res.json();
      })
      .then((data: Schedule[]) => {
        if (!cancelled) setSchedules(data.filter((item) => item.status !== 0 && item.statusLabel !== "PAUSED"));
      })
      .catch((err) => !cancelled && setErrorText(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải lịch chiếu."))
      .finally(() => !cancelled && setLoadingSchedules(false));

    return () => { cancelled = true; };
  }, [selectedMovie?.id]);

  // Finishes restoring a PayOS-return snapshot once schedules for the restored movie have
  // loaded (selecting the movie above resets date/time/scheduleId/seats synchronously, so this
  // has to run as a separate step after the fetch resolves, not in the same tick).
  useEffect(() => {
    if (!pendingRestoreRef.current || !schedules.length) return;
    const snap = pendingRestoreRef.current;
    setSelectedDate(snap.showDate ?? "");
    setSelectedTime(snap.showTime ?? "");
    setSelectedScheduleId(snap.scheduleId ?? null);
    setSelectedSeats(snap.selectedSeats);
    pendingRestoreRef.current = null;
  }, [schedules]);

  const dates = useMemo(() => uniq(schedules.map((s) => s.showDate).filter(Boolean) as string[]), [schedules]);
  const times = useMemo(() => uniq(schedules.filter((s) => s.showDate === selectedDate).map((s) => s.scheduleTime)), [schedules, selectedDate]);
  const rooms = useMemo(() => schedules.filter((s) => s.showDate === selectedDate && s.scheduleTime === selectedTime), [schedules, selectedDate, selectedTime]);
  const selectedSchedule = useMemo(() => rooms.find((s) => s.scheduleId === selectedScheduleId) ?? rooms[0] ?? null, [rooms, selectedScheduleId]);

  // Một ngày chỉ thực sự "chọn được" nếu còn ít nhất 1 suất chiếu trong ngày đó chưa qua giờ —
  // khách không được phép chọn ngày/giờ chiếu đã ở quá khứ.
  const isDateDisabled = (dateStr: string) =>
    !schedules.some((s) => s.showDate === dateStr && !isPastSchedule(s.showDate, s.scheduleTime));
  const isTimeDisabled = (timeStr: string) => isPastSchedule(selectedDate, timeStr);

  useEffect(() => {
    if (!dates.length) return;
    if (selectedDate && dates.includes(selectedDate)) return;
    setSelectedDate(dates.find((d) => !isDateDisabled(d)) ?? dates[0]);
  }, [dates, selectedDate]);
  useEffect(() => {
    if (!times.length) return;
    if (selectedTime && times.includes(selectedTime)) return;
    setSelectedTime(times.find((t) => !isTimeDisabled(t)) ?? times[0]);
  }, [times, selectedTime]);
  useEffect(() => { if (rooms.length && (!selectedScheduleId || !rooms.some((s) => s.scheduleId === selectedScheduleId))) setSelectedScheduleId(rooms[0].scheduleId); }, [rooms, selectedScheduleId]);

  // Start 5-minute hold timer when entering seat selection; clear on step 1 or success.
  // Online tickets have no seat to hold, so there's no timer for that flow.
  useEffect(() => {
    if (step === 2 && ticketMode === "THEATER") setHoldSecondsLeft(HOLD_SECONDS);
    else if (step === 1 || step === 5 || ticketMode === "ONLINE") setHoldSecondsLeft(null);
  }, [step, ticketMode]);

  useEffect(() => {
    if (holdSecondsLeft === null) return;
    if (holdSecondsLeft <= 0) {
      setHoldSecondsLeft(null);
      releaseSeatCodes(selectedSeats);
      setSelectedSeats([]);
      setSelectedConcessions({});
      setAppliedVoucher(null);
      setVoucherInput("");
      setVoucherError("");
      setCustomerName(currentUser?.fullName ?? "");
      setCustomerEmail(currentUser?.email ?? "");
      setShowInvoice(false);
      setTicket(null);
      setPaymentStatus("PENDING_PAYMENT");
      setErrorText("Thời gian giữ ghế đã hết (5 phút). Vui lòng chọn lại ghế.");
      setStep(1);
      return;
    }
    const t = setTimeout(() => setHoldSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [holdSecondsLeft]);

  const showtimeId = selectedSchedule?.showtimeId ?? selectedSchedule?.scheduleId ?? null;

  useEffect(() => {
    if (ticketMode === "ONLINE") return;
    if (!showtimeId || !selectedMovie?.id) return;
    let cancelled = false;
    setLoadingSeats(true);
    setSelectedSeats([]);
    fetch(`${API_BASE}/api/showtimes/${showtimeId}/seats?holderId=${encodeURIComponent(holderId)}`, { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải sơ đồ ghế của suất chiếu.");
        return res.json();
      })
      .then((data: ScheduleSeatAvailability[]) => !cancelled && setSeats(data))
      .catch((err) => {
        if (!cancelled) {
          setSeats([]);
          setErrorText(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải ghế.");
        }
      })
      .finally(() => !cancelled && setLoadingSeats(false));
    return () => { cancelled = true; };
  }, [showtimeId, selectedMovie?.id, ticketMode]);

  // While the customer is choosing seats, poll so seats another shopper just
  // grabbed show up as locked here in near-real-time (mirrors what "held for 5
  // minutes" is protecting against server-side). Not applicable to online tickets.
  // Uses refreshSeatsSilently (defined below) so the poll never wipes the
  // customer's own in-progress seat selection or flashes the full loading state.
  useEffect(() => {
    if (step !== 2 || ticketMode !== "THEATER") return;
    const interval = setInterval(() => { refreshSeatsSilently(); }, 5000);
    return () => clearInterval(interval);
  }, [step, ticketMode, showtimeId, holderId]);

  const holdSeatCodes = async (codes: string[]) => {
    if (!showtimeId || codes.length === 0 || !holderId) return { heldSeats: codes, rejectedSeats: [] as string[] };
    try {
      const res = await fetch(`${API_BASE}/api/showtimes/${showtimeId}/seats/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() } as Record<string, string>,
        body: JSON.stringify({ seatCodes: codes, holderId }),
      });
      if (!res.ok) return { heldSeats: [] as string[], rejectedSeats: codes };
      return (await res.json()) as { heldSeats: string[]; rejectedSeats: string[] };
    } catch {
      return { heldSeats: [] as string[], rejectedSeats: codes };
    }
  };

  const releaseSeatCodes = (codes: string[]) => {
    if (!showtimeId || codes.length === 0 || !holderId) return;
    fetch(`${API_BASE}/api/showtimes/${showtimeId}/seats/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() } as Record<string, string>,
      body: JSON.stringify({ seatCodes: codes, holderId }),
    }).catch(() => { /* best-effort — the hold will simply expire on its own */ });
  };

  // Keep the latest release call + selection around so the unmount cleanup below
  // (registered once) always releases whatever is actually selected at the time,
  // not whatever was selected on first render.
  const releaseSeatCodesRef = useRef(releaseSeatCodes);
  releaseSeatCodesRef.current = releaseSeatCodes;
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  useEffect(() => {
    return () => { releaseSeatCodesRef.current(selectedSeatsRef.current); };
  }, []);

  const seatsByRow = useMemo(() => seats.reduce<Record<string, ScheduleSeatAvailability[]>>((acc, seat) => {
    const row = seat.seatCode.charAt(0);
    acc[row] = [...(acc[row] ?? []), seat];
    return acc;
  }, {}), [seats]);

  const isSeatUnavailable = (seat: ScheduleSeatAvailability) => {
    const normalizedStatus = typeof seat.status === "string" ? seat.status.toUpperCase() : seat.status;
    return Boolean(
      seat.booked ||
      seat.locked ||
      seat.disabled ||
      seat.active === false ||
      seat.available === false ||
      (seat.seatStatus != null && seat.seatStatus !== 0) ||
      normalizedStatus === 0 ||
      normalizedStatus === "LOCKED" ||
      normalizedStatus === "INACTIVE" ||
      normalizedStatus === "DISABLED"
    );
  };

  // Làm mới trạng thái ghế ở nền (poll định kỳ + ngay sau khi giữ ghế bị từ chối) mà
  // không xoá lựa chọn hiện tại của khách hay bật cờ loadingSeats — chỉ bỏ chọn đúng
  // (những) ghế vừa thực sự bị người khác giữ/đặt mất trong lúc khách đang thao tác.
  const refreshSeatsSilently = async () => {
    if (!showtimeId) return;
    try {
      const res = await fetch(`${API_BASE}/api/showtimes/${showtimeId}/seats?holderId=${encodeURIComponent(holderId)}`, { headers: authHeaders() });
      if (!res.ok) return;
      const data: ScheduleSeatAvailability[] = await res.json();
      setSeats(data);
      setSelectedSeats((current) => {
        const stillHeld = current.filter((code) => {
          const seat = data.find((s) => s.seatCode === code);
          return seat && !isSeatUnavailable(seat);
        });
        if (stillHeld.length !== current.length) {
          setErrorText("Một số ghế bạn chọn vừa được người khác giữ. Vui lòng chọn ghế khác.");
        }
        return stillHeld;
      });
    } catch {
      // best-effort — giữ nguyên trạng thái ghế hiện tại nếu làm mới nền thất bại
    }
  };

  const priceOf = (seatCode: string) => seats.find((seat) => seat.seatCode === seatCode)?.seatType === 2 ? 150000 : 100000;
  const totalSeatsPrice = ticketMode === "ONLINE"
    ? onlineQuantity * ONLINE_TICKET_PRICE
    : selectedSeats.reduce((sum, seat) => sum + priceOf(seat), 0);
  const serviceCharge = Math.round(totalSeatsPrice * 0.1);
  const concessionTotal = concessionItems.reduce((sum, item) => sum + item.price * (selectedConcessions[item.id] ?? 0), 0);
  const netTotal = totalSeatsPrice + serviceCharge + concessionTotal;
  const voucherDiscount = appliedVoucher ? Math.max(netTotal - appliedVoucher.finalAmount, 0) : 0;
  const payableTotal = Math.max(netTotal - voucherDiscount, 0);
  const selectedComboItems = concessionItems
    .map((item) => ({ ...item, quantity: selectedConcessions[item.id] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const comboText = selectedComboItems.length
    ? selectedComboItems.map((item) => `${item.name} x${item.quantity}`).join(", ")
    : "Chưa chọn";
  const voucherText = appliedVoucher ? appliedVoucher.code : "Chưa áp dụng";
  const invoiceId = ticket?.invoiceId ?? mockPayment.invoiceId;
  const ticketCode = mockPayment.ticketCode;
  const selectedSeatRows = uniq(selectedSeats.map((seat) => seat.charAt(0))).join(", ");
  const selectedSeatNumbers = selectedSeats.map((seat) => seat.slice(1)).join(", ");
  const voucherDiscountText = voucherDiscount > 0 ? `-${money(voucherDiscount)}` : money(0);

  const selectMovie = (movie: Movie) => {
    releaseSeatCodes(selectedSeats);
    setSelectedMovie(movie);
    setTicket(null);
    setStep(1);
    setShowMovieGrid(false);
  };

  const toggleSeat = (seatCode: string) => {
    const seat = seats.find((item) => item.seatCode === seatCode);
    if (!seat || isSeatUnavailable(seat)) return;
    setErrorText("");
    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(selectedSeats.filter((item) => item !== seatCode));
      releaseSeatCodes([seatCode]);
      return;
    }
    if (selectedSeats.length >= 8) {
      setErrorText("B\u1ea1n ch\u1ec9 \u0111\u01b0\u1ee3c ch\u1ecdn t\u1ed1i \u0111a 8 gh\u1ebf.");
      return;
    }
    setSelectedSeats([...selectedSeats, seatCode]);
    holdSeatCodes([seatCode]).then(({ rejectedSeats }) => {
      if (rejectedSeats.length === 0) return;
      // Someone else grabbed it between our last seat-map refresh and now \u2014 undo
      // the optimistic selection and refresh so it shows as locked.
      setSelectedSeats((current) => current.filter((code) => !rejectedSeats.includes(code)));
      setErrorText(`Gh\u1ebf ${rejectedSeats.join(", ")} v\u1eeba \u0111\u01b0\u1ee3c kh\u00e1ch kh\u00e1c gi\u1eef. Vui l\u00f2ng ch\u1ecdn gh\u1ebf kh\u00e1c.`);
      refreshSeatsSilently();
    });
  };

  const goSeatStep = () => {
    if (!selectedMovie) return setErrorText("Vui lòng chọn phim.");
    if (!selectedSchedule) return setErrorText("Vui lòng chọn ngày chiếu, giờ chiếu và phòng chiếu.");
    // Chốt lại lần nữa phòng khi suất chiếu đã chọn kịp qua giờ trong lúc khách đang xem trang
    // (VD: mở trang lúc 19:58, tới lúc bấm tiếp tục đã sang 20:01 cho suất 20:00).
    if (isPastSchedule(selectedSchedule.showDate, selectedSchedule.scheduleTime)) {
      return setErrorText("Suất chiếu này đã qua giờ chiếu. Vui lòng chọn suất khác.");
    }
    setErrorText("");
    setStep(2);
  };

  const goConfirmStep = () => {
    if (ticketMode === "ONLINE") {
      if (onlineQuantity < 1) return setErrorText("Vui l\u00f2ng ch\u1ecdn s\u1ed1 l\u01b0\u1ee3ng v\u00e9.");
    } else if (selectedSeats.length === 0) {
      return setErrorText("Vui l\u00f2ng ch\u1ecdn \u00edt nh\u1ea5t 1 gh\u1ebf.");
    }
    setErrorText("");
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError("");
    setStep(3);
  };

  const updateConcession = (itemId: string, delta: number) => {
    setSelectedConcessions((current) => {
      const nextQty = Math.max(0, Math.min(9, (current[itemId] ?? 0) + delta));
      const next = { ...current };
      if (nextQty === 0) delete next[itemId];
      else next[itemId] = nextQty;
      return next;
    });
    setAppliedVoucher(null);
    setVoucherError("");
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) { setVoucherError("Vui lòng nhập mã giảm giá"); return; }
    setVoucherLoading(true);
    setVoucherError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/vouchers/validate?code=${encodeURIComponent(voucherInput.trim())}&amount=${netTotal}`
      );
      const data = await res.json();
      if (data.valid) {
        setAppliedVoucher({
          code: data.code,
          discountType: data.discountType,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
        });
        setVoucherError("");
      } else {
        setVoucherError(data.message ?? "Mã không hợp lệ");
        setAppliedVoucher(null);
      }
    } catch {
      setVoucherError("Không thể kiểm tra mã. Vui lòng thử lại.");
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError("");
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMovie || !selectedSchedule) return setErrorText("Dữ liệu suất chiếu không hợp lệ.");
    if (isBlank(customerName) || !isNameLike(customerName)) return setErrorText("Họ và tên không hợp lệ (chỉ được chứa chữ cái và khoảng trắng).");
    if (!isValidEmail(customerEmail)) return setErrorText("Email không hợp lệ.");

    setTicket({
      invoiceId: mockPayment.invoiceId,
      showtimeId: selectedSchedule.showtimeId ?? selectedSchedule.scheduleId,
      movieName: selectedMovie.title,
      showDate: selectedSchedule.showDate ?? selectedDate,
      showTime: selectedSchedule.scheduleTime,
      seats: ticketMode === "ONLINE" ? `Online x${onlineQuantity}` : selectedSeats.join(", "),
      bookedSeats: selectedSeats,
      status: "PENDING_PAYMENT",
      totalAmount: payableTotal,
    });
    setPaymentStatus("PENDING_PAYMENT");
    setShowInvoice(false);
    setErrorText("");
    setStep(4);
  };

  const resetBookingFlow = () => {
    setSelectedSeats([]);
    setOnlineQuantity(1);
    setSelectedConcessions({});
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError("");
    setCustomerName(currentUser?.fullName ?? "");
    setCustomerEmail(currentUser?.email ?? "");
    setShowInvoice(false);
    setTicket(null);
    setPaymentStatus("PENDING_PAYMENT");
    setHoldSecondsLeft(null);
    setStep(1);
  };

  const goHome = () => {
    setHoldSecondsLeft(null);
    onBookingComplete?.();
  };

  const startPayOSCheckout = async () => {
    if (!selectedSchedule || !selectedMovie) return;
    setSubmitting(true);
    setErrorText("");
    try {
      const showtimeId = selectedSchedule.showtimeId ?? selectedSchedule.scheduleId;
      const res = await fetch(`${API_BASE}/api/payments/payos/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() } as Record<string, string>,
        body: JSON.stringify({
          scheduleShow: String(showtimeId),
          scheduleShowTime: selectedSchedule.scheduleTime,
          movieName: selectedMovie.title,
          seat: ticketMode === "ONLINE" ? "" : selectedSeats.join(","),
          ticketMode,
          quantity: ticketMode === "ONLINE" ? onlineQuantity : undefined,
          showtimeId,
          accountId: currentUser?.accountId ?? null,
          totalMoney: payableTotal,
          useScore: 0,
          addScore: 0,
          customerEmail: customerEmail.trim(),
          returnUrl: `${window.location.origin}${ROUTES.BOOKING_PAYOS_RETURN}`,
          cancelUrl: `${window.location.origin}${ROUTES.BOOKING_PAYOS_CANCEL}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Không thể khởi tạo thanh toán" }));
        throw new Error((err as { error?: string }).error ?? "Không thể khởi tạo thanh toán. Vui lòng thử lại.");
      }
      const data: { invoiceId: string; orderCode: number; checkoutUrl: string } = await res.json();

      const snapshot: PendingPayOSCheckout = {
        orderCode: data.orderCode,
        invoiceId: data.invoiceId,
        movieId: selectedMovie.id,
        ticketMode,
        selectedSeats,
        onlineQuantity,
        customerName,
        customerEmail,
        showDate: selectedSchedule.showDate,
        showTime: selectedSchedule.scheduleTime,
        scheduleId: selectedSchedule.scheduleId,
        selectedConcessions,
        appliedVoucher,
      };
      sessionStorage.setItem(PAYOS_PENDING_KEY, JSON.stringify(snapshot));

      window.location.href = data.checkoutUrl; // full navigation away to PayOS's hosted page
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Lỗi thanh toán. Vui lòng thử lại.");
      setSubmitting(false);
    }
  };

  // Handles landing back on /booking/payos-return or /booking/payos-cancel after the PayOS
  // round trip. Runs once on mount (payosMode is fixed for the lifetime of this page).
  useEffect(() => {
    if (!payosMode) return;

    const raw = sessionStorage.getItem(PAYOS_PENDING_KEY);
    const snapshot: PendingPayOSCheckout | null = raw ? JSON.parse(raw) : null;
    const orderCode = payosOrderCode ?? (snapshot ? String(snapshot.orderCode) : null);

    if (payosMode === "cancel") {
      if (orderCode) {
        fetch(`${API_BASE}/api/payments/payos/cancel/${orderCode}`, {
          method: "POST",
          headers: authHeaders() as Record<string, string>,
        }).catch(() => {});
      }
      sessionStorage.removeItem(PAYOS_PENDING_KEY);
      setErrorText("Thanh toán đã bị hủy. Vui lòng thử lại.");
      setStep(1);
      return;
    }

    // payosMode === "return"
    if (!orderCode) {
      setErrorText("Không tìm thấy thông tin thanh toán. Vui lòng kiểm tra vé của bạn trong Hồ sơ.");
      setStep(1);
      return;
    }

    if (snapshot) {
      const movie = movies.find((m) => m.id === snapshot.movieId);
      if (movie) {
        setSelectedMovie(movie);
        setShowMovieGrid(false);
      }
      setTicketMode(snapshot.ticketMode);
      setOnlineQuantity(snapshot.onlineQuantity);
      setCustomerName(snapshot.customerName);
      setCustomerEmail(snapshot.customerEmail);
      setSelectedConcessions(snapshot.selectedConcessions);
      setAppliedVoucher(snapshot.appliedVoucher);
      pendingRestoreRef.current = snapshot; // finished by the schedules-loaded effect once the movie's schedules arrive
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // ~30s at 2s/poll

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`${API_BASE}/api/payments/payos/status/${orderCode}`, { headers: authHeaders() });
        if (res.ok) {
          const data: { invoiceId: string; paymentStatus: string; amount: number } = await res.json();
          if (data.paymentStatus === "PAID") {
            setTicket({
              invoiceId: data.invoiceId,
              movieName: snapshot ? (movies.find((m) => m.id === snapshot.movieId)?.title ?? "") : "",
              showDate: snapshot?.showDate ?? "",
              showTime: snapshot?.showTime ?? "",
              seats: snapshot?.ticketMode === "ONLINE"
                ? `Online x${snapshot.onlineQuantity}`
                : (snapshot?.selectedSeats.join(", ") ?? ""),
              bookedSeats: snapshot?.selectedSeats ?? [],
              status: "PAID",
              totalAmount: data.amount,
            });
            setPaymentStatus("PAID");
            setHoldSecondsLeft(null);
            setShowInvoice(false);
            setVerifyingPayOS(false);
            sessionStorage.removeItem(PAYOS_PENDING_KEY);
            setStep(5);
            return;
          }
          if (data.paymentStatus === "CANCELLED" || data.paymentStatus === "FAILED") {
            setVerifyingPayOS(false);
            sessionStorage.removeItem(PAYOS_PENDING_KEY);
            setErrorText("Thanh toán không thành công hoặc đã bị hủy. Vui lòng thử lại.");
            setStep(1);
            return;
          }
        }
      } catch {
        // network hiccup — retry on next tick
      }

      if (attempts >= MAX_ATTEMPTS) {
        setVerifyingPayOS(false);
        setErrorText("Đang chờ xác nhận từ PayOS. Vui lòng kiểm tra lại trong trang Hồ sơ của bạn sau ít phút.");
        return;
      }
      setTimeout(poll, 2000);
    };

    setVerifyingPayOS(true);
    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payosMode]);

  const ticketPrintHtml = () => `
    <html>
      <head>
        <title>${ticketCode}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&family=Noto+Sans:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; }
          body { margin: 0; background: #121212; color: #ffffff; font-family: "Be Vietnam Pro", "Noto Sans", "Segoe UI", Arial, sans-serif; padding: 28px; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
          .ticket { position: relative; width: min(600px, 95vw); margin: 0 auto; overflow: hidden; border: 1px solid rgba(229,9,20,.35); border-radius: 18px; background: #111111; box-shadow: 0 30px 90px rgba(0,0,0,.48); }
          .layout { display: grid; grid-template-columns: minmax(0, 3.55fr) minmax(135px, 1fr); min-height: 250px; }
          .main { position: relative; padding: 19px 20px 14px 44px; border-right: 1px dashed rgba(229,9,20,.35); overflow: hidden; }
          .stub { position: absolute; inset: 0 auto 0 0; width: 28px; display: flex; align-items: center; justify-content: center; background: #240607; border-right: 1px solid rgba(229,9,20,.3); color: #e50914; font-size: 6px; font-weight: 900; letter-spacing: 5px; writing-mode: vertical-rl; text-orientation: mixed; }
          .main:after { content: ""; position: absolute; right: 17px; top: 19px; width: 63px; height: 63px; border: 7px solid rgba(229,9,20,.1); border-radius: 999px; }
          .brand { color: #e50914; font-size: 19px; font-weight: 900; letter-spacing: 1px; margin: 0; }
          .tagline { color: #bdbdbd; font-size: 6px; letter-spacing: 3px; margin: 2px 0 18px; }
          .stars { color: #e50914; letter-spacing: 4.5px; font-size: 8px; }
          .hero { margin: 0; color: white; font-size: 26px; line-height: 1.08; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
          .subtitle { margin: 7px 0 14px; color: #e50914; font-size: 10px; font-weight: 800; letter-spacing: 3px; text-align: center; }
          .fields { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(75px, 1fr) minmax(75px, 1fr); gap: 7px; }
          .field { min-height: 39px; padding: 7px 10px; border: 1px solid rgba(229,9,20,.3); border-radius: 5px; background: rgba(17,17,17,.82); }
          .wide { grid-column: span 2; }
          .label { display: block; color: #e64248; font-size: 5px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
          .value { display: block; margin-top: 4px; color: white; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
          .note { margin-top: 8px; border: 1px solid rgba(229,9,20,.3); border-radius: 999px; padding: 5px 8px; color: #bdbdbd; font-size: 6px; }
          .side { position: relative; padding: 17px 20px 14px 15px; background: #0b0b0b; }
          .side h2 { margin: 0; color: #e50914; font-size: 15px; letter-spacing: 3px; text-align: center; }
          .side-title { margin: 8px 0 13px; color: white; letter-spacing: 3px; font-size: 7px; font-weight: 800; text-align: center; }
          .qr { width: 75px; height: 75px; margin: 0 auto 11px; border: 5px solid white; border-radius: 6px; background: repeating-linear-gradient(45deg,#111 0 7px,#fff 7px 14px), repeating-linear-gradient(-45deg,#111 0 5px,#fff 5px 11px); }
          .bill { border-top: 1px solid rgba(229,9,20,.45); padding-top: 8px; }
          .bill-row { display: flex; justify-content: space-between; gap: 11px; padding: 4px 0; color: rgba(255,255,255,.82); font-size: 6px; }
          .negative { color: #e23a41; }
          .total { margin-top: 13px; border-top: 1px dashed rgba(229,9,20,.35); padding-top: 9px; color: #e50914; }
          .total span { display: block; font-size: 5px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
          .total strong { display: block; margin-top: 10px; font-size: 21px; line-height: 1; }
          .code-edge { position: absolute; right: 5px; top: 50%; transform: translateY(-50%) rotate(90deg); transform-origin: center; color: rgba(255,255,255,.55); letter-spacing: 2px; font-size: 6px; white-space: nowrap; }
          @media (max-width: 760px) { body { padding: 14px; } .layout { grid-template-columns: 1fr; } .main { padding: 32px 22px; border-right: 0; border-bottom: 1px dashed rgba(255,180,170,.45); } .stub, .code-edge { display: none; } .fields { grid-template-columns: 1fr; } .field, .field:nth-child(3n), .field:nth-last-child(-n+3) { border-right: 0; border-bottom: 1px solid rgba(155,36,42,.42); } .field:last-child { border-bottom: 0; } .wide { grid-column: span 1; } .subtitle { text-align: left; letter-spacing: 7px; } }
          @media print { body { background: #050303; padding: 10mm; } .ticket { box-shadow: none; page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <article class="ticket">
          <div class="layout">
            <section class="main">
              <div class="stub">ADMIT ONE</div>
              <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start">
                <div><h1 class="brand">CINENOIR</h1><p class="tagline">More Than Cinema</p></div>
                <div class="stars">&#9733; &#9733; &#9733; &#9733; &#9733;</div>
              </div>
              <h2 class="hero">${selectedMovie?.title ?? ticket?.movieName ?? "Vé Xem Phim"}</h2>
              <div class="subtitle">CINEMA TICKET</div>
              <div class="fields">
                <div class="field"><span class="label">Movie</span><span class="value">${selectedMovie?.title ?? ticket?.movieName ?? "--"}</span></div>
                <div class="field"><span class="label">Date</span><span class="value">${formatDate(selectedSchedule?.showDate)}</span></div>
                <div class="field"><span class="label">Time</span><span class="value">${selectedSchedule?.scheduleTime ?? "--"}</span></div>
                <div class="field"><span class="label">Cinema Room</span><span class="value">${selectedSchedule?.cinemaRoomName ?? "--"}</span></div>
                <div class="field"><span class="label">Row</span><span class="value">${selectedSeatRows || "--"}</span></div>
                <div class="field"><span class="label">Seat</span><span class="value">${selectedSeatNumbers || selectedSeats.join(", ") || "--"}</span></div>
                <div class="field wide"><span class="label">Ticket Code</span><span class="value">${ticketCode}</span></div>
                <div class="field"><span class="label">Guest</span><span class="value">${customerName || "--"}</span></div>
              </div>
              <div class="note">Cảm ơn bạn đã lựa chọn CineNoir. Chúc bạn có buổi xem phim tuyệt vời!</div>
            </section>
            <aside class="side">
              <h2>CINENOIR</h2>
              <div class="side-title">CINEMA TICKET</div>
              <div class="qr" aria-label="QR code"></div>
              <div class="bill">
                <div class="bill-row"><span>Tiền vé</span><strong>${money(totalSeatsPrice)}</strong></div>
                <div class="bill-row"><span>Phí dịch vụ</span><strong>${money(serviceCharge)}</strong></div>
                <div class="bill-row"><span>Combo</span><strong>${money(concessionTotal)}</strong></div>
                <div class="bill-row negative"><span>Voucher</span><strong>${voucherDiscountText}</strong></div>
              </div>
              <div class="total"><span>Tổng thanh toán</span><strong>${money(payableTotal)}</strong></div>
              <div class="code-edge">${ticketCode}</div>
            </aside>
          </div>
        </article>
      </body>
    </html>`;

  const openPrintableTicket = () => {
    const printWindow = window.open("", "_blank", "width=700,height=420");
    if (!printWindow) return;
    printWindow.document.write(ticketPrintHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadTicketPdf = () => {
    openPrintableTicket();
  };


  const stepLabels = ["Suất chiếu", ticketMode === "ONLINE" ? "Số lượng" : "Ghế", "Xác nhận", "Thanh toán", "Vé của bạn"];

  return (
    <div className="w-full min-h-[85vh] text-[#e5e2e1] px-4 py-6">
      {verifyingPayOS && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0c0b0b]/90 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-[#e50914]" />
          <p className="text-sm font-bold text-white">Đang xác nhận thanh toán với PayOS...</p>
        </div>
      )}
      <div className="mx-auto mb-8 max-w-4xl">
        {holdSecondsLeft !== null && step >= 2 && step <= 4 && (
          <div className="mb-3 flex justify-end">
            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${holdSecondsLeft <= 60 ? "border-[#e50914]/60 bg-[#e50914]/10 text-[#e50914] animate-pulse" : "border-[#5e3f3b]/50 bg-[#1a1a1a] text-[#e9bcb6]/70"}`}>
              <Clock className="h-3 w-3" />
              Giữ ghế: {String(Math.floor(holdSecondsLeft / 60)).padStart(2, "0")}:{String(holdSecondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}
        <BookingStepper current={step} labels={stepLabels} />
      </div>

      {step === 1 && (
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)] lg:items-stretch">
          <div className="min-w-0">
            {!showMovieGrid && selectedMovie ? (
              <div className="flex h-full flex-col rounded-xl border border-[#ffb4aa]/35 bg-[#201f1f] p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#5e3f3b]/30 pb-4">
                  <h2 className="text-2xl font-black text-white">Thông tin phim</h2>
                  <button type="button" onClick={() => setShowMovieGrid(true)}
                    className="shrink-0 text-xs font-bold uppercase tracking-widest text-[#ffb4aa] hover:underline">
                    Đổi phim
                  </button>
                </div>
                <div className="grid flex-1 gap-6 md:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:gap-7">
                  <img src={selectedMovie.imageUrl} alt={selectedMovie.title}
                    className="mx-auto h-[380px] w-full max-w-[300px] rounded-xl object-cover shadow-[0_18px_55px_rgba(0,0,0,0.35)] md:h-[420px]" />
                  <div className="flex min-w-0 flex-col justify-center space-y-5">
                    <div>
                      <p className="text-3xl font-black leading-tight text-white md:text-4xl">{selectedMovie.title}</p>
                      {selectedMovie.genre && <p className="mt-2 text-sm font-bold text-[#e9c349]">{selectedMovie.genre}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <MovieInfoPill label="Thời lượng" value={selectedMovie.duration ? `${selectedMovie.duration} phút` : "Chưa cập nhật"} />
                      <MovieInfoPill label="Ngày chiếu" value={selectedDate ? formatDate(selectedDate) : "Chưa chọn"} />
                      <MovieInfoPill label="Giờ chiếu" value={selectedTime || "Chưa chọn"} />
                      <MovieInfoPill label="Phòng chiếu" value={selectedSchedule?.cinemaRoomName ?? "Chưa chọn"} />
                    </div>

                    <p className="line-clamp-3 text-sm leading-6 text-[#e9bcb6]/75">
                      {selectedMovie.description || selectedMovie.synopsis || "Thông tin mô tả phim đang được cập nhật."}
                    </p>

                    <button type="button" onClick={() => setDetailMovie(selectedMovie)}
                      className="w-fit rounded-lg border border-[#ffb4aa]/45 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#ffb4aa] transition hover:border-[#ffb4aa] hover:bg-[#ffb4aa]/10 hover:text-white">
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between border-b border-[#5e3f3b]/30 pb-4">
                  <h2 className="text-2xl font-black text-white">Chọn phim</h2>
                </div>
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                  {movies.map((movie) => (
                    <div key={movie.id}
                      className={`overflow-hidden rounded-xl border bg-[#201f1f] transition ${selectedMovie?.id === movie.id ? "border-[#ffb4aa] ring-2 ring-[#ffb4aa]/30" : "border-[#5e3f3b]/35 hover:border-[#ffb4aa]/50"}`}>
                      <button type="button" onClick={() => selectMovie(movie)} className="w-full text-left">
                        <img src={movie.imageUrl} alt={movie.title} className="aspect-[2/3] w-full object-cover" />
                        <div className="px-3 pt-3 pb-1">
                          <p className="truncate text-sm font-bold text-white">{movie.title}</p>
                          <p className="mt-0.5 truncate text-[10px] text-[#e9c349]">{movie.genre}</p>
                        </div>
                      </button>
                      <div className="px-3 pb-3">
                        <button type="button" onClick={() => setDetailMovie(movie)}
                          className="w-full rounded border border-[#5e3f3b]/40 py-1 text-[9px] font-bold text-[#e9bcb6]/60 hover:border-[#ffb4aa]/50 hover:text-[#ffb4aa] transition">
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex h-full flex-col rounded-xl border border-[#5e3f3b]/40 bg-[#201f1f] p-5 space-y-4">
              <div className="space-y-3 border-b border-[#5e3f3b]/30 pb-4">
                <h3 className="flex items-center gap-2 font-bold text-white">
                  <Calendar className="h-4 w-4 text-[#ffb4aa]" />
                  Lịch chiếu từ hệ thống
                </h3>
                <div className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-[#0d0d0d] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
                  <button type="button" onClick={() => setTicketMode("THEATER")}
                    className={`rounded-full py-2 text-[11px] font-black uppercase tracking-wide transition-all ${ticketMode === "THEATER" ? "bg-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.28)]" : "text-[#e9bcb6]/70 hover:text-white"}`}>
                    Xem Tại Rạp
                  </button>
                  <button type="button" onClick={() => setTicketMode("ONLINE")}
                    className={`rounded-full py-2 text-[11px] font-black uppercase tracking-wide transition-all ${ticketMode === "ONLINE" ? "bg-gradient-to-r from-[#b20710] via-[#e50914] to-[#b20710] text-white shadow-[0_0_24px_rgba(229,9,20,0.52)]" : "text-[#e9bcb6]/70 hover:text-white"}`}>
                    Xem Online
                  </button>
                </div>
              </div>
              {loadingSchedules ? (
                <Loading text="Đang tải lịch chiếu..." />
              ) : schedules.length === 0 ? (
                <Empty text="Phim này hiện chưa có suất chiếu khả dụng." />
              ) : (
                <div className="flex flex-1 flex-col gap-4">
                  <Picker title="Ngày chiếu" items={dates} selected={selectedDate} onSelect={setSelectedDate} format={formatDate} isDisabled={isDateDisabled} disabledHint="Ngày này không còn suất chiếu nào sắp tới" />
                  <Picker title="Giờ chiếu" items={times} selected={selectedTime} onSelect={setSelectedTime} isDisabled={isTimeDisabled} disabledHint="Suất chiếu này đã qua giờ" />
                  <div className="space-y-2">
                    <Label>Phòng chiếu</Label>
                    <div className="space-y-2">
                      {rooms.map((room) => (
                        <button key={room.scheduleId} type="button" onClick={() => setSelectedScheduleId(room.scheduleId)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${selectedSchedule?.scheduleId === room.scheduleId ? "border-[#e50914] bg-[#e50914] text-white" : "border-[#5e3f3b]/40 bg-[#131313] text-[#e9bcb6]/75"}`}>
                          <span className="flex items-center gap-2 font-bold">
                            <DoorOpen className="h-4 w-4" />
                            {room.cinemaRoomName ?? `Phòng #${room.cinemaRoomId}`}
                          </span>
                          <span className="mt-1 block text-[10px] opacity-75">{room.seatQuantity ?? 0} ghế</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {errorText && <ErrorBox message={errorText} />}
              <button type="button" onClick={goSeatStep}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-[#e50914] py-3 text-xs font-black uppercase text-white hover:brightness-110">
                {ticketMode === "ONLINE" ? "Tiếp tục" : "Chọn ghế"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 1 && ticketMode === "ONLINE" && (
        <section className="mx-auto mt-6 max-w-7xl space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#e50914]/35 bg-[radial-gradient(circle_at_100%_0%,rgba(229,9,20,0.15),transparent_35%),#181818] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)] md:p-6">
            <h2 className="flex items-center gap-2 border-b border-white/10 pb-4 text-lg font-black uppercase text-[#ff3b44]">
              <MonitorPlay className="h-5 w-5" />Online Streaming
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Video, title: "Không cần chọn ghế", text: "Vào xem ngay sau khi thanh toán" },
                { icon: Clock, title: "Xem ngay sau thanh toán", text: "Vé mở trong thời gian 24 giờ" },
                { icon: RotateCcw, title: "Tối đa 2 lượt xem", text: "Chủ động thời gian trải nghiệm" },
                { icon: Laptop, title: "Xem trên CineNoir", text: "Hỗ trợ trình duyệt CineNoir" },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e50914]/15 text-[#ff3b44]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="mt-0.5 text-xs text-white/55">{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-[#e50914]/35 bg-[#230d0f]/65 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#ff7278]">
                <CircleAlert className="h-5 w-5" />Lưu ý quan trọng
              </div>
              <p className="mt-2 text-xs leading-5 text-white/65">
                Vé chỉ có hiệu lực trong 24 giờ kể từ lúc thanh toán. Không hỗ trợ hoàn hoặc hủy vé. Chỉ sử dụng cho tài khoản đã mua.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-[#181818] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Thanh toán an toàn", text: "Bảo mật thông tin 100%" },
              { icon: Ticket, title: "Vé điện tử", text: "Nhận vé ngay sau thanh toán" },
              { icon: Clock, title: "Linh hoạt", text: "Xem trong vòng 24 giờ" },
              { icon: MonitorPlay, title: "Đa thiết bị", text: "Hỗ trợ mọi thiết bị có trình duyệt" },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className={`flex items-center gap-3 p-5 ${index > 0 ? "border-t border-white/10 sm:border-t-0 lg:border-l" : ""}`}>
                <Icon className="h-7 w-7 text-[#e50914]" />
                <div>
                  <p className="text-sm font-black text-white">{title}</p>
                  <p className="mt-1 text-xs text-white/50">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 2 && ticketMode === "ONLINE" && (
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-5">
            <button type="button" onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs font-bold text-[#e9bcb6]/85 hover:text-white">
              <ArrowLeft className="h-4 w-4" />Quay lại
            </button>
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-[#5e3f3b]/30 bg-[#1c1b1b] p-10 text-center">
              <Video className="h-10 w-10 text-[#ffb4aa]/70" />
              <div>
                <p className="text-lg font-black text-white">Vé xem online</p>
                <p className="mt-1 text-xs text-[#e9bcb6]/70">Không cần chọn ghế — bạn có thể xem phim trên web ngay sau khi thanh toán.</p>
              </div>
              <div className="space-y-2">
                <Label>Số lượng vé</Label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setOnlineQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#5e3f3b]/45 text-white hover:border-[#ffb4aa]/60">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-2xl font-black text-white">{onlineQuantity}</span>
                  <button type="button" onClick={() => setOnlineQuantity((q) => Math.min(8, q + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#5e3f3b]/45 text-white hover:border-[#ffb4aa]/60">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-[#e9bcb6]/60">{money(ONLINE_TICKET_PRICE)} / vé</p>
              </div>
            </div>
          </div>
          <Summary
            selectedMovie={selectedMovie}
            schedule={selectedSchedule}
            selectedSeats={[]}
            seatLabel={`${onlineQuantity} vé online`}
            total={totalSeatsPrice}
            errorText={errorText}
            onConfirm={goConfirmStep}
            confirmDisabled={onlineQuantity < 1}
          />
        </section>
      )}

      {step === 2 && ticketMode === "THEATER" && (
        <section className={`mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-12 ${selectedSeats.length > 0 ? "pb-20 lg:pb-0" : ""}`}>
          <div className="lg:col-span-8 space-y-5">
            <button type="button" onClick={() => { releaseSeatCodes(selectedSeats); setSelectedSeats([]); setStep(1); }}
              className="flex items-center gap-1 text-xs font-bold text-[#e9bcb6]/85 hover:text-white">
              <ArrowLeft className="h-4 w-4" />Quay lại
            </button>
            {selectedSchedule?.cinemaRoomName && (
              <div className="flex items-center justify-between rounded-xl border border-[#5e3f3b]/30 bg-[#201f1f] px-5 py-3">
                <div>
                  <p className="font-black text-white text-sm">{selectedSchedule.cinemaRoomName}</p>
                  <p className="text-[10px] text-[#e9bcb6]/60 mt-0.5">
                    Tổng {selectedSchedule.seatQuantity ?? seats.length} ghế
                    {seats.length > 0 && ` · ${seats.filter((s) => s.booked).length} đã đặt · ${seats.filter((s) => !s.booked).length} còn trống`}
                  </p>
                </div>
                <DoorOpen className="h-5 w-5 text-[#ffb4aa]/60" />
              </div>
            )}
            <div className="rounded-2xl border border-[#5e3f3b]/30 bg-[#1c1b1b] p-6 md:p-10">
              <div className="mx-auto mb-8 h-2 w-10/12 rounded-full bg-[#e50914]/35 shadow-[0_-10px_35px_rgba(229,9,20,0.45)]" />
              <p className="mb-6 text-center text-[10px] font-black uppercase tracking-[0.4em] text-[#e9bcb6]/65">Màn hình</p>
              {loadingSeats ? (
                <Loading text="Đang tải sơ đồ ghế..." />
              ) : seats.length === 0 ? (
                <Empty text="Chưa có dữ liệu ghế cho suất chiếu này." />
              ) : (
                <div className="relative">
                  {/* Edge fades hint that the seat map scrolls horizontally on narrow rooms/screens. */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#1c1b1b] to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#1c1b1b] to-transparent" />
                  <div className="flex min-w-max flex-col items-center gap-1.5 overflow-x-auto px-1 pb-1">
                    {Object.keys(seatsByRow).sort().map((row) => (
                      <div key={row} className="flex items-center gap-1.5">
                        <span className="w-4 text-center text-[10px] font-black text-[#af8782]/60">{row}</span>
                        {[...seatsByRow[row]].sort((a, b) => Number(a.seatCode.slice(1)) - Number(b.seatCode.slice(1))).map((seat) => {
                          const active = selectedSeats.includes(seat.seatCode);
                          const unavailable = isSeatUnavailable(seat);
                          const cls = unavailable
                            ? "text-[#353534] cursor-not-allowed"
                            : active
                            ? "text-[#e50914]"
                            : "text-[#af8782] hover:text-white";
                          return (
                            <button key={seat.seatCode} type="button" disabled={unavailable}
                              onClick={() => toggleSeat(seat.seatCode)} title={seat.seatCode}
                              className={`group relative flex h-7 w-8 items-center justify-center rounded transition-all sm:h-6 sm:w-7 ${cls} ${
                                active ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#1c1b1b]" : ""
                              }`}>
                              <SeatIcon className="h-full w-full" />
                              <span className={`pointer-events-none absolute inset-0 flex items-center justify-center pt-0.5 text-[7px] font-black ${active ? "text-white" : unavailable ? "text-[#1a1a1a]" : "text-[#141414]"}`}>
                                {seat.seatCode.slice(1)}
                              </span>
                            </button>
                          );
                        })}
                        <span className="w-4 text-center text-[10px] font-black text-[#af8782]/60">{row}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {seats.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[#5e3f3b]/25 pt-4 text-[10px] text-[#e9bcb6]/70">
                  <SeatLegendItem colorClass="text-[#af8782]" label="Ghế thường" />
                  <SeatLegendItem colorClass="text-[#e50914]" label="Đang chọn" ring />
                  <SeatLegendItem colorClass="text-[#353534]" label="Đã đặt" />
                </div>
              )}
            </div>
          </div>
          <Summary
            selectedMovie={selectedMovie}
            schedule={selectedSchedule}
            selectedSeats={selectedSeats}
            total={totalSeatsPrice}
            errorText={errorText}
            onConfirm={goConfirmStep}
          />

          {/* Sticky mobile summary — the desktop Summary panel above sits below the seat
              map in document order on narrow screens, so the running total is otherwise
              out of view while tapping seats. */}
          {selectedSeats.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#5e3f3b]/40 bg-[#141312]/95 p-3 backdrop-blur-sm lg:hidden">
              <div className="mx-auto flex max-w-6xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#af8782]">
                    {selectedSeats.length} ghế · {selectedSeats.join(", ")}
                  </p>
                  <p className="text-base font-black text-white">{money(totalSeatsPrice)}</p>
                </div>
                <button type="button" onClick={goConfirmStep}
                  className="shrink-0 rounded-lg bg-[#e50914] px-5 py-2.5 text-xs font-black uppercase text-white hover:brightness-110 active:scale-95 transition-all">
                  Xác nhận
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="mx-auto max-w-6xl">
          <form onSubmit={submitBooking} className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            <div className="rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-6 space-y-4">
              <button type="button" onClick={() => setStep(2)}
                className="flex items-center gap-1 text-xs font-bold text-[#e9bcb6]/85 hover:text-white">
                <ArrowLeft className="h-4 w-4" />Quay lại
              </button>
              <h2 className="text-2xl font-black text-white">Xác nhận đặt vé</h2>
              <div className="space-y-2 rounded-lg border border-[#5e3f3b]/25 bg-[#171616] p-3">
                <Info icon={<Calendar className="h-4 w-4" />} text={`Ngày chiếu: ${formatDate(selectedSchedule?.showDate)}`} />
                <Info icon={<Clock className="h-4 w-4" />} text={`Giờ chiếu: ${selectedSchedule?.scheduleTime ?? "Chưa chọn"}`} />
                <Info icon={<DoorOpen className="h-4 w-4" />} text={`Phòng chiếu: ${selectedSchedule?.cinemaRoomName ?? "Chưa chọn"}`} />
                <Info icon={<Armchair className="h-4 w-4" />} text={ticketMode === "ONLINE" ? `Số lượng vé: ${onlineQuantity}` : `Ghế: ${selectedSeats.join(", ")}`} />
              </div>

              <FormField label="Họ và tên" icon={<User className="h-3.5 w-3.5" />} required>
                <input required value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="h-10 w-full rounded-lg border border-[#5e3f3b]/45 bg-[#131313] px-3 text-xs text-white placeholder:text-[#5e3f3b]/60 transition-colors focus:outline-none focus:border-[#ffb4aa]/70 focus:ring-2 focus:ring-[#ffb4aa]/15" />
              </FormField>
              <FormField label="Email nhận vé" icon={<Mail className="h-3.5 w-3.5" />} required>
                <input required type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-10 w-full rounded-lg border border-[#5e3f3b]/45 bg-[#131313] px-3 text-xs text-white placeholder:text-[#5e3f3b]/60 transition-colors focus:outline-none focus:border-[#ffb4aa]/70 focus:ring-2 focus:ring-[#ffb4aa]/15" />
              </FormField>
            </div>

            <ConcessionPicker
              items={concessionItems}
              selected={selectedConcessions}
              onChange={updateConcession}
            />

            <div className="md:col-span-2 rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#5e3f3b]/25 pb-3">
                <h3 className="text-lg font-black text-white">Chi tiết thanh toán</h3>
                <Receipt className="h-4 w-4 text-[#ffb4aa]" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#af8782]/85 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Mã giảm giá
                  </p>
                  {!appliedVoucher && (
                    <Link to={ROUTES.HOME} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-[#ffb4aa]/80 hover:text-[#ffb4aa] hover:underline">
                      <TicketPercent className="w-3 h-3" /> Xem mã đang có
                    </Link>
                  )}
                </div>
                {appliedVoucher ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-900/20 px-3 py-2">
                    <div>
                      <p className="text-xs font-black text-green-300">Voucher: {appliedVoucher.code}</p>
                      <p className="mt-0.5 text-[10px] text-green-400">Giảm: -{money(voucherDiscount)}</p>
                    </div>
                    <button type="button" onClick={removeVoucher} className="text-green-400/60 hover:text-green-300 transition-colors" aria-label="Bỏ voucher">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyVoucher())}
                      placeholder="Nhập mã voucher..."
                      className="flex-1 h-9 rounded-lg border border-[#5e3f3b]/45 bg-[#131313] px-3 text-xs text-white font-mono tracking-wider transition-colors focus:outline-none focus:border-[#ffb4aa] focus:ring-2 focus:ring-[#ffb4aa]/15"
                    />
                    <button type="button" onClick={handleApplyVoucher} disabled={voucherLoading}
                      className="h-9 px-3 rounded-lg bg-[#2a2a2a] border border-[#ffb4aa]/30 text-[#ffb4aa] text-xs font-bold hover:bg-[#353534] active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap">
                      {voucherLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Áp dụng"}
                    </button>
                  </div>
                )}
                {voucherError && (
                  <p className="text-[10px] text-[#ffb4ab] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> Mã giảm giá không hợp lệ.
                  </p>
                )}
              </div>

              <PaymentBill
                selectedSeats={selectedSeats}
                seatLabel={ticketMode === "ONLINE" ? `${onlineQuantity} vé online` : undefined}
                ticketAmount={totalSeatsPrice}
                serviceFee={serviceCharge}
                comboItems={selectedComboItems}
                comboAmount={concessionTotal}
                voucherCode={appliedVoucher?.code ?? null}
                voucherDiscount={voucherDiscount}
                totalAmount={payableTotal}
              />

              {errorText && <ErrorBox message={errorText} />}
              <button disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e50914] py-3.5 text-xs font-black uppercase text-white shadow-[0_4px_16px_rgba(229,9,20,0.3)] transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận đặt vé — {money(payableTotal)}
              </button>
            </div>
          </form>
        </section>
      )}


      {step === 4 && (
        <section className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#e50914]/40 bg-[#e50914]/10">
              <CreditCard className="h-8 w-8 text-[#e50914]" />
            </div>
            <h2 className="text-3xl font-black text-white">Thanh toán</h2>
            <p className="mt-2 text-sm text-[#e9bcb6]/75">Hoàn tất thanh toán để xác nhận đặt vé của bạn.</p>
          </div>

          <div className="rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-6 space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-[#e50914]/35 bg-[#1a1a1a] p-4">
              <div className="flex h-12 w-20 items-center justify-center rounded bg-gradient-to-r from-[#00B14F] to-[#00d15f]">
                <span className="text-xs font-black tracking-wider text-white">PayOS</span>
              </div>
              <div>
                <p className="text-sm font-black text-white">PayOS</p>
                <p className="text-[10px] text-[#e9bcb6]/60">Bạn sẽ được chuyển đến trang thanh toán an toàn của PayOS.</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#e50914]/40 bg-[#e50914]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#ff6b70]">
                <Check className="h-3 w-3" /> Đã chọn
              </div>
            </div>
            <p className="flex items-center gap-2 text-[11px] text-[#8c8c8c]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#e9bcb6]/50" />
              Giao dịch được mã hoá và bảo mật.
            </p>

            <PaymentBill
              title="Xác nhận thanh toán"
              selectedSeats={selectedSeats}
              seatLabel={ticketMode === "ONLINE" ? `${onlineQuantity} vé online` : undefined}
              ticketAmount={totalSeatsPrice}
              serviceFee={serviceCharge}
              comboItems={selectedComboItems}
              comboAmount={concessionTotal}
              voucherCode={appliedVoucher?.code ?? null}
              voucherDiscount={voucherDiscount}
              totalAmount={payableTotal}
              footer="Phương thức: PayOS"
            />

            {errorText && <ErrorBox message={errorText} />}
            <button type="button" onClick={startPayOSCheckout} disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e50914] py-3.5 text-sm font-black uppercase text-white shadow-[0_4px_16px_rgba(229,9,20,0.3)] transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
              {submitting ? "Đang chuyển đến PayOS..." : `Thanh toán qua PayOS – ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(payableTotal)}`}
            </button>
            <div className="pt-1">
              <button type="button" onClick={() => setStep(3)}
                className="flex w-full items-center justify-center gap-1 text-xs font-bold text-[#e9bcb6]/65 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Quay lại
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="mx-auto max-w-6xl space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e50914] shadow-[0_0_40px_rgba(229,9,20,0.35)]">
              <CheckCircle className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white">Thanh toán thành công</h2>
            <p className="mt-2 text-sm text-[#e9bcb6]/75">
              {ticketMode === "ONLINE"
                ? "Vé xem online CineNoir của bạn đã sẵn sàng."
                : "Vé điện tử CineNoir của bạn đã sẵn sàng. Mã vé dùng để đối chiếu tại quầy soát vé."}
            </p>
            {customerEmail && (
              <p className="mt-1 text-xs text-[#af8782]/70">Vé đã được gửi tới email {customerEmail}.</p>
            )}
            {ticketMode === "ONLINE" ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                <Video className="h-3 w-3" />
                Sẵn sàng xem online — không cần check-in
              </span>
            ) : (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e9c349]/50 bg-[#1e1b15] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#e9c349]">
                <Clock className="h-3 w-3" />
                Chờ xác thực — vui lòng xuất trình QR khi vào rạp
              </span>
            )}
          </div>

          <CineNoirTicket
            movieName={selectedMovie?.title ?? ticket?.movieName ?? "Vé Xem Phim"}
            showDate={formatDate(selectedSchedule?.showDate)}
            showTime={selectedSchedule?.scheduleTime ?? "--"}
            roomName={ticketMode === "ONLINE" ? "Xem Online" : selectedSchedule?.cinemaRoomName ?? "--"}
            seatRows={ticketMode === "ONLINE" ? "Online" : selectedSeatRows || "--"}
            seatNumbers={ticketMode === "ONLINE" ? `${onlineQuantity} vé` : selectedSeatNumbers || selectedSeats.join(", ") || "--"}
            ticketCode={ticketCode}
            invoiceId={invoiceId}
            customerName={customerName || "--"}
            ticketAmount={totalSeatsPrice}
            serviceFee={serviceCharge}
            comboAmount={concessionTotal}
            voucherDiscountText={voucherDiscountText}
            totalAmount={payableTotal}
          />

          <div className="mx-auto w-full max-w-[560px] space-y-3">
            {/* Primary — the one action most people take from this screen */}
            <button type="button" onClick={goHome}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e50914] py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_16px_rgba(229,9,20,0.3)] transition-all hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
              <Home className="h-4 w-4" />Về Trang Chủ
            </button>

            {/* Secondary — ways to get hold of the ticket itself */}
            <div className={`grid gap-2 ${ticketMode === "ONLINE" && selectedMovie?.movieUrl ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
              <button type="button" onClick={downloadTicketPdf} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#5e3f3b]/45 bg-[#1a1a1a] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#e9bcb6]/85 transition-colors hover:border-[#ffb4aa]/50 hover:text-[#ffb4aa]"><Download className="h-3.5 w-3.5" />Tải PDF</button>
              <button type="button" onClick={openPrintableTicket} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#5e3f3b]/45 bg-[#1a1a1a] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#e9bcb6]/85 transition-colors hover:border-[#ffb4aa]/50 hover:text-[#ffb4aa]"><Printer className="h-3.5 w-3.5" />In vé</button>
              <button type="button" onClick={() => setShowInvoice((value) => !value)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[#5e3f3b]/45 bg-[#1a1a1a] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[#e9bcb6]/85 transition-colors hover:border-[#ffb4aa]/50 hover:text-[#ffb4aa]"><FileText className="h-3.5 w-3.5" />Hóa đơn</button>
              {ticketMode === "ONLINE" && selectedMovie?.movieUrl && (
                <button type="button" onClick={() => onWatchMovie?.(selectedMovie)} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300 transition-colors hover:border-emerald-400/60 hover:bg-emerald-950/40"><Video className="h-3.5 w-3.5" />Xem Phim</button>
              )}
            </div>

            {/* Ghost — a repeat-flow action, not the moment's main CTA */}
            <div className="pt-1 text-center">
              <button type="button" onClick={resetBookingFlow}
                className="text-xs font-bold text-[#e9bcb6]/60 underline-offset-2 transition-colors hover:text-[#ffb4aa] hover:underline">
                Đặt vé khác
              </button>
            </div>
          </div>

          {showInvoice && (
            <PaymentBill
              title="Hóa đơn thanh toán"
              selectedSeats={selectedSeats}
              seatLabel={ticketMode === "ONLINE" ? `${onlineQuantity} vé online` : undefined}
              ticketAmount={totalSeatsPrice}
              serviceFee={serviceCharge}
              comboItems={selectedComboItems}
              comboAmount={concessionTotal}
              voucherCode={appliedVoucher?.code ?? null}
              voucherDiscount={voucherDiscount}
              totalAmount={payableTotal}
              footer={`Phương thức thanh toán: PayOS • Trạng thái: Đã thanh toán`}
            />
          )}
        </section>
      )}


      {detailMovie && (
        <MovieDetailModal
          movie={detailMovie}
          onClose={() => setDetailMovie(null)}
          onBook={(m) => { selectMovie(m); setDetailMovie(null); }}
        />
      )}
    </div>
  );
}

// Shared five-step progress indicator for the booking flow — gives each step a real
// done / current / upcoming state (instead of every reached step looking identical)
// plus a short label and a connecting track, so users can tell where they are at a glance.
function BookingStepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-start">
      {labels.map((label, idx) => {
        const n = idx + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                  done
                    ? "bg-[#e50914] text-white"
                    : active
                    ? "bg-[#e50914] text-white ring-4 ring-[#e50914]/25"
                    : "border border-[#5e3f3b]/45 bg-[#2a2a2a] text-[#736760]"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span
                className={`text-center text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px] ${
                  active ? "text-white" : done ? "text-[#e9bcb6]/70" : "text-[#736760]"
                }`}
              >
                {label}
              </span>
            </div>
            {n < labels.length && (
              <div className="mx-1.5 mt-4 h-[2px] flex-1 sm:mx-2">
                <div className={`h-full rounded-full transition-all duration-500 ${done ? "bg-[#e50914]" : "bg-[#3a3230]"}`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function BillRow({ label, value, muted = false, negative = false }: { label: string; value: string; muted?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-xs">
      <span className={muted ? "text-[#af8782]" : "text-[#e9bcb6]/85"}>{label}</span>
      <span className={negative ? "font-bold text-[#ff6b70]" : "font-bold text-white"}>{value}</span>
    </div>
  );
}

function TicketInfoCell({ label, value, wide = false, mono = false, highlight = false }: { label: string; value: string; wide?: boolean; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-md border border-[#e50914]/30 bg-[#111111]/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#e50914]">{label}</p>
      <p className={`mt-1 break-words uppercase leading-tight text-white ${mono ? "font-mono text-[10px] tracking-[0.06em]" : highlight ? "text-sm font-black tracking-wide" : "text-xs font-black tracking-wide"}`}>
        {value || "--"}
      </p>
    </div>
  );
}

function TicketBillLine({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 text-[10px] ${negative ? "text-[#e50914]" : "text-[#bdbdbd]"}`}>
      <span>{label}</span>
      <strong className="text-right font-black text-white">{value}</strong>
    </div>
  );
}

function TicketQrBox({ ticketCode, invoiceId }: { ticketCode: string; invoiceId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(invoiceId, { width: 200, margin: 1 })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [invoiceId]);

  return (
    <div className="text-center">
      <div className="mx-auto flex h-[90px] w-[90px] items-center justify-center rounded-xl border-[5px] border-white bg-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code" className="h-full w-full object-contain" />
        ) : (
          <QrCode className="h-8 w-8 rounded bg-white/85 p-1.5 text-black" />
        )}
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.35em] text-[#bdbdbd]">QR CODE</p>
      <p className="mt-1 break-all font-mono text-[9px] text-[#bdbdbd]/65">{ticketCode} {"\u2022"} {invoiceId}</p>
    </div>
  );
}

function CineNoirTicket({ movieName, showDate, showTime, roomName, seatRows, seatNumbers, ticketCode, invoiceId, customerName, ticketAmount, serviceFee, comboAmount, voucherDiscountText, totalAmount }: {
  movieName: string;
  showDate: string;
  showTime: string;
  roomName: string;
  seatRows: string;
  seatNumbers: string;
  ticketCode: string;
  invoiceId: string;
  customerName: string;
  ticketAmount: number;
  serviceFee: number;
  comboAmount: number;
  voucherDiscountText: string;
  totalAmount: number;
}) {
  return (
    <article id="cinenoir-ticket" className="relative mx-auto w-full max-w-[800px] overflow-hidden rounded-[12px] border border-[#e50914]/35 bg-[#111111] text-white shadow-[0_30px_90px_rgba(0,0,0,0.48)] lg:w-[50vw]">
      <div className="pointer-events-none absolute -left-2 top-12 hidden h-4 w-4 rounded-full border border-[#e50914]/35 bg-[#0a0a0a] lg:block" />
      <div className="pointer-events-none absolute -left-2 bottom-12 hidden h-4 w-4 rounded-full border border-[#e50914]/35 bg-[#0a0a0a] lg:block" />
      <div className="pointer-events-none absolute -right-2 top-12 hidden h-4 w-4 rounded-full border border-[#e50914]/35 bg-[#0a0a0a] lg:block" />
      <div className="pointer-events-none absolute -right-2 bottom-12 hidden h-4 w-4 rounded-full border border-[#e50914]/35 bg-[#0a0a0a] lg:block" />
      <div className="pointer-events-none absolute right-[22%] top-0 z-20 hidden h-4 w-7 -translate-y-1/2 rounded-b-full border border-t-0 border-[#e50914]/35 bg-[#0a0a0a] lg:block" />
      <div className="pointer-events-none absolute bottom-0 right-[22%] z-20 hidden h-4 w-7 translate-y-1/2 rounded-t-full border border-b-0 border-[#e50914]/35 bg-[#0a0a0a] lg:block" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3.55fr)_minmax(135px,1fr)]">
        <section className="relative min-h-[250px] overflow-hidden border-b border-dashed border-[#e50914]/35 bg-[#111111] p-3 sm:p-4 lg:border-b-0 lg:border-r lg:border-dashed lg:pl-[44px] lg:pr-5">
          <div className="pointer-events-none absolute right-7 top-5 h-16 w-16 rounded-full border-[7px] border-[#e50914]/10">
            <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-[#e50914]/10" />
            <div className="absolute left-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#e50914]/10" />
            <div className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[#e50914]/10" />
            <div className="absolute bottom-2.5 left-2.5 h-2.5 w-2.5 rounded-full bg-[#e50914]/10" />
            <div className="absolute bottom-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-[#e50914]/10" />
          </div>

          <div className="absolute inset-y-0 left-0 hidden w-7 border-r border-[#e50914]/30 bg-[#240607] md:block">
            <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-[#e50914]/35" />
            <div className="absolute left-1/2 top-4 -translate-x-1/2 text-[#e50914]">{"\u2605"}</div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.42em] text-[#e50914] [writing-mode:vertical-rl]">
              ADMIT ONE
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#e50914]">{"\u2605"}</div>
          </div>

          <div className="relative z-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-black tracking-wide text-[#e50914] sm:text-2xl">CINENOIR</h3>
                <p className="mt-0.5 text-[9px] tracking-[0.18em] text-[#bdbdbd]">More Than Cinema</p>
              </div>
              <div className="hidden text-xs tracking-[0.42em] text-[#e50914] sm:block">{"\u2605".repeat(5)}</div>
            </div>

            <div className="mt-5 text-center sm:text-left">
              <h2 className="line-clamp-2 text-2xl font-black uppercase leading-tight tracking-[0.06em] text-white sm:text-3xl lg:text-[2.15rem]">{movieName}</h2>
              <div className="mt-2 flex items-center justify-center gap-2.5 sm:justify-start">
                <span className="h-px w-8 bg-[#e50914]/45" />
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#e50914] sm:text-xs">CINEMA TICKET</p>
                <span className="hidden h-px w-8 bg-[#e50914]/45 sm:block" />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,2.2fr)_minmax(75px,1fr)_minmax(75px,1fr)]">
              <TicketInfoCell label="Movie" value={movieName} highlight />
              <TicketInfoCell label="Date" value={showDate} />
              <TicketInfoCell label="Time" value={showTime} />
              <TicketInfoCell label="Cinema Room" value={roomName} />
              <TicketInfoCell label="Row" value={seatRows} />
              <TicketInfoCell label="Seat" value={seatNumbers} />
              <TicketInfoCell label="Ticket Code" value={ticketCode} wide mono />
              <TicketInfoCell label="Guest" value={customerName} />
            </div>

            <div className="mt-3 flex items-center gap-1.5 rounded-full border border-[#e50914]/30 bg-[#111111]/85 px-3 py-2 text-[10px] text-[#bdbdbd]">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#e50914]/40 text-[#e50914]">{"\u2605"}</span>
              <span>{"C\u1ea3m \u01a1n b\u1ea1n \u0111\u00e3 l\u1ef1a ch\u1ecdn CineNoir. Ch\u00fac b\u1ea1n c\u00f3 bu\u1ed5i xem phim tuy\u1ec7t v\u1eddi."}</span>
            </div>
          </div>
        </section>

        <aside className="relative min-h-[250px] overflow-hidden bg-[#0b0b0b] p-3 lg:pl-4 lg:pr-5">
          <div className="absolute inset-y-0 right-0 hidden w-4 border-l border-[#e50914]/25 bg-[#240607] lg:block">
            <div className="absolute left-1/2 top-4 -translate-x-1/2 text-[#e50914]/70">{"\u2605"}</div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[9px] tracking-[0.18em] text-[#bdbdbd] [writing-mode:vertical-rl]">
              {ticketCode}
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#e50914]/70">{"\u2605"}</div>
          </div>

          <div className="relative z-10 pr-0 lg:pr-2">
            <h3 className="text-center text-xl font-black tracking-[0.12em] text-[#e50914]">CINENOIR</h3>
            <div className="mt-1.5 text-center text-[10px] tracking-[0.28em] text-[#e50914]">{"\u2605".repeat(5)}</div>
            <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.24em] text-white">Cinema Ticket</p>

            <div className="mt-3.5">
              <TicketQrBox ticketCode={ticketCode} invoiceId={invoiceId} />
            </div>

            <div className="mt-4 space-y-0.5 border-t border-[#e50914]/45 pt-2.5">
              <TicketBillLine label={"Ti\u1ec1n v\u00e9"} value={money(ticketAmount)} />
              <TicketBillLine label={"Ph\u00ed d\u1ecbch v\u1ee5"} value={money(serviceFee)} />
              <TicketBillLine label="Combo" value={money(comboAmount)} />
              <TicketBillLine label="Voucher" value={voucherDiscountText} negative={voucherDiscountText.startsWith("-")} />
            </div>

            <div className="mt-3.5 border-t border-dashed border-[#e50914]/40 pt-3">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#e50914]">{"T\u1ed5ng thanh to\u00e1n"}</p>
              <p className="mt-2 text-3xl font-black leading-none text-[#e50914]">{money(totalAmount)}</p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

function PaymentBill({ title = "Chi tiết thanh toán", selectedSeats, seatLabel, ticketAmount, serviceFee, comboItems, comboAmount, voucherCode, voucherDiscount, totalAmount, footer }: {
  title?: string;
  selectedSeats: string[];
  seatLabel?: string;
  ticketAmount: number;
  serviceFee: number;
  comboItems: Array<ConcessionItem & { quantity: number }>;
  comboAmount: number;
  voucherCode: string | null;
  voucherDiscount: number;
  totalAmount: number;
  footer?: string;
}) {
  return (
    <div className="rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-6">
      <h3 className="mb-4 flex items-center gap-2 border-b border-[#5e3f3b]/25 pb-3 text-sm font-black uppercase tracking-widest text-white">
        <Receipt className="h-4 w-4 text-[#ffb4aa]" />{title}
      </h3>
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#af8782]">Tiền vé</p>
          <BillRow label={seatLabel ?? `${selectedSeats.length || 0} ghế ${selectedSeats.join(", ") || "Chưa chọn"}`} value={money(ticketAmount)} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#af8782]">Phí dịch vụ</p>
          <BillRow label="Phí xử lý đặt vé" value={money(serviceFee)} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#af8782]">Combo bắp nước</p>
          {comboItems.length ? comboItems.map((item) => (
            <BillRow key={item.id} label={`${item.name} x${item.quantity}`} value={money(item.price * item.quantity)} />
          )) : <BillRow label="Chưa chọn" value={money(comboAmount)} muted />}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#af8782]">Voucher</p>
          <BillRow label={voucherCode ?? "Chưa áp dụng"} value={voucherDiscount > 0 ? `-${money(voucherDiscount)}` : money(0)} negative={voucherDiscount > 0} muted={!voucherCode} />
        </div>
        <div className="border-t border-dashed border-[#5e3f3b]/55 pt-3">
          <div className="flex items-end justify-between gap-4">
            <span className="text-xs font-black uppercase tracking-widest text-[#ffb4aa]">Tổng thanh toán</span>
            <span className="text-2xl font-black text-white">{money(totalAmount)}</span>
          </div>
        </div>
        {footer && <p className="pt-2 text-xs text-[#e9bcb6]/65">{footer}</p>}
      </div>
    </div>
  );
}

function MovieInfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#5e3f3b]/35 bg-[#131313] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-[#af8782]">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white">{value}</p>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-black uppercase tracking-widest text-[#af8782]/85">{children}</label>;
}
// A cinema-seat silhouette (backrest + seat pad + two armrests) so the seat map reads like a
// real seating chart (CGV-style) instead of plain numbered squares.
function SeatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 20" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5V14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" />
      <rect x="1.5" y="11" width="3" height="7" rx="1.5" />
      <rect x="19.5" y="11" width="3" height="7" rx="1.5" />
    </svg>
  );
}
function Loading({ text }: { text: string }) {
  return <div className="flex items-center gap-2 py-6 text-xs text-[#e9bcb6]/75"><Loader2 className="h-4 w-4 animate-spin" />{text}</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[#5e3f3b]/45 p-4 text-xs text-[#e9bcb6]/70">{text}</div>;
}
function SeatLegendItem({ colorClass, label, ring = false }: { colorClass: string; label: string; ring?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <SeatIcon className={`h-4 w-4 rounded ${colorClass} ${ring ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#1c1b1b]" : ""}`} />
      {label}
    </span>
  );
}
function ErrorBox({ message }: { message: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-[#93000a] bg-[#93000a]/10 p-3 text-xs text-[#ffb4ab]"><AlertCircle className="h-4 w-4 shrink-0" />{message}</div>;
}
function Info({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-3 text-xs text-[#e9bcb6]/85">{icon}<span>{text}</span></div>;
}
// A persistent above-field label (icon + text) instead of relying on placeholder text alone —
// placeholders disappear the moment someone starts typing, so field identity would otherwise vanish.
function FormField({ label, icon, required, children }: { label: string; icon: React.ReactNode; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#e9bcb6]/70">
        {icon}
        {label} {required && <span className="text-[#e50914]">*</span>}
      </label>
      {children}
    </div>
  );
}
function Price({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#5e3f3b]/10 pb-2 text-xs">
      <span className={strong ? "font-black text-white" : "text-[#e9bcb6]/80"}>{label}</span>
      <span className={strong ? "font-black text-[#ffb4aa]" : "font-bold text-white"}>{value}</span>
    </div>
  );
}
function ConcessionPicker({ items, selected, onChange }: {
  items: ConcessionItem[];
  selected: Record<string, number>;
  onChange: (itemId: string, delta: number) => void;
}) {
  return (
    <div className="md:col-span-2 rounded-xl border border-[#5e3f3b]/35 bg-[#201f1f] p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#5e3f3b]/25 pb-3">
        <h3 className="text-lg font-black uppercase tracking-widest text-white">Combo Bắp & Nước</h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#ffb4aa]">Chọn thêm trước khi thanh toán</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const qty = selected[item.id] ?? 0;
          return (
            <div key={item.id} className={`rounded-lg border p-3 transition ${qty > 0 ? "border-[#ffb4aa]/70 bg-[#2a1b1a]" : "border-[#5e3f3b]/35 bg-[#171616]"}`}>
              <img
                src={item.imageUrl}
                alt={item.name}
                className="mx-auto h-[120px] w-full max-w-[140px] rounded-lg object-cover"
              />
              <div className="mt-3 space-y-1 text-center">
                <p className="text-sm font-black text-white">{item.name}</p>
                <p className="min-h-4 text-xs text-[#e9bcb6]/70">{item.description}</p>
                <p className="text-sm font-black text-[#e9c349]">{money(item.price)}</p>
              </div>
              <div className="mx-auto mt-3 flex h-9 max-w-[132px] items-center justify-between rounded-lg border border-[#5e3f3b]/45 bg-[#131313] px-1">
                <button type="button" onClick={() => onChange(item.id, -1)} disabled={qty === 0} className="flex h-4 w-4 items-center justify-center rounded text-white hover:bg-[#353534] disabled:text-[#5e3f3b] disabled:hover:bg-transparent" aria-label={`Giảm ${item.name}`}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-7 text-center text-sm font-black text-[#ffb4aa]">{qty}</span>
                <button type="button" onClick={() => onChange(item.id, 1)} className="flex h-4 w-4 items-center justify-center rounded text-white hover:bg-[#353534]" aria-label={`Tăng ${item.name}`}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Picker({ title, items, selected, onSelect, format, isDisabled, disabledHint }: {
  title: string;
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
  format?: (value: string) => string;
  isDisabled?: (value: string) => boolean;
  disabledHint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const disabled = isDisabled?.(item) ?? false;
          return (
            <button key={item} type="button" disabled={disabled} onClick={() => onSelect(item)}
              title={disabled ? disabledHint : undefined}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                disabled
                  ? "cursor-not-allowed border-[#5e3f3b]/20 bg-[#131313]/40 text-[#5e3f3b] line-through decoration-[#5e3f3b]/60"
                  : selected === item
                  ? "border-[#e50914] bg-[#e50914] text-white"
                  : "border-[#5e3f3b]/40 bg-[#131313] text-[#e9bcb6]/75 hover:border-[#ffb4aa]/50"
              }`}>
              {format ? format(item) : item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function Summary({ selectedMovie, schedule, selectedSeats, seatLabel, total, errorText, onConfirm, confirmDisabled }: {
  selectedMovie: Movie | null;
  schedule: Schedule | null;
  selectedSeats: string[];
  seatLabel?: string;
  total: number;
  errorText: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}) {
  const disabled = confirmDisabled ?? selectedSeats.length === 0;
  return (
    <div className="lg:col-span-4">
      <div className="sticky top-24 space-y-4 rounded-xl border border-[#5e3f3b]/40 bg-[#201f1f] p-6">
        <h3 className="flex items-center gap-2 font-bold text-white">
          <Armchair className="h-4 w-4 text-[#ffb4aa]" />Tóm tắt đơn
        </h3>
        <Price label="Phim" value={selectedMovie?.title ?? "Chưa chọn"} />
        <Price label="Ngày chiếu" value={formatDate(schedule?.showDate)} />
        <Price label="Giờ chiếu" value={schedule?.scheduleTime ?? "Chưa chọn"} />
        <Price label="Phòng chiếu" value={schedule?.cinemaRoomName ?? "Chưa chọn"} />
        <Price label={seatLabel ? "Vé" : "Ghế"} value={seatLabel ?? (selectedSeats.length ? selectedSeats.join(", ") : "Chưa chọn")} />
        {!seatLabel && <Price label="Số lượng ghế" value={String(selectedSeats.length)} />}
        <Price label="Tổng cộng" value={money(total)} strong />
        {errorText && <ErrorBox message={errorText} />}
        <button type="button" onClick={onConfirm} disabled={disabled}
          className="w-full rounded-lg bg-[#e50914] py-3 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50">
          {seatLabel ? "Xác nhận" : "Xác nhận ghế"}
        </button>
      </div>
    </div>
  );
}
