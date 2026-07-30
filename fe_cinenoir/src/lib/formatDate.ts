/**
 * Formats a date string as dd/MM/yyyy (vi-VN, always zero-padded) so every
 * screen shows dates the same way instead of each component picking its
 * own toLocaleDateString options.
 */
export function formatDate(value?: string | null, fallback = "—"): string {
  if (!value) return fallback;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Hôm nay dạng "yyyy-MM-dd" theo giờ local của trình duyệt (tránh lệch ngày do UTC gần nửa đêm). */
export function todayLocalStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Giờ hiện tại dạng "HH:mm" theo giờ local của trình duyệt. */
export function nowTimeStr(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * True nếu suất chiếu (showDate "yyyy-MM-dd" + scheduleTime "HH:mm[:ss]") đã bắt đầu/qua giờ
 * so với hiện tại. So sánh dạng chuỗi zero-padded — hợp lệ vì ngày ISO và giờ 24h sắp xếp theo
 * thứ tự chuỗi trùng với thứ tự thời gian thực.
 */
export function isPastSchedule(showDate?: string | null, scheduleTime?: string | null): boolean {
  if (!showDate) return false;
  const today = todayLocalStr();
  if (showDate < today) return true;
  if (showDate > today) return false;
  if (!scheduleTime) return false;
  return scheduleTime.slice(0, 5) <= nowTimeStr();
}
