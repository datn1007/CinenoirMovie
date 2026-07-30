import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LucideIcon, Search as SearchIcon, RefreshCw, X, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Shared presentational primitives for the admin panel.
 * Purely visual — no business logic, no data fetching, no state ownership.
 * Every admin CRUD page composes these to keep spacing/typography/color
 * consistent across Users, Staff, Vouchers, Rooms, Movies and Schedules.
 */

// ───────────────────────── Page header ─────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#332220]/40 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-black font-headline-lg text-[#e5e2e1] tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1.5 text-xs text-[#e9bcb6]/70 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

// ───────────────────────── Buttons ─────────────────────────

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Làm mới"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#5e3f3b]/40 text-[#e9bcb6]/70 transition-all duration-200 hover:border-[#ffb4aa]/50 hover:bg-white/[0.04] hover:text-white active:scale-95 cursor-pointer"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
    </button>
  );
}

export function PrimaryButton({
  icon: Icon,
  children,
  className,
  ...rest
}: { icon?: LucideIcon } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`flex h-10 items-center gap-2 rounded-lg bg-[#e50914] px-5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(229,9,20,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_6px_20px_rgba(229,9,20,0.4)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer whitespace-nowrap ${className ?? ""}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`h-10 rounded-lg border border-[#5e3f3b]/50 px-4 text-xs font-bold text-[#e9bcb6]/80 transition-all duration-200 hover:border-[#af8782]/60 hover:bg-white/[0.03] hover:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  title,
  onClick,
  tone = "default",
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  tone?: "default" | "danger" | "success" | "gold";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "hover:text-[#ff6b61] hover:border-[#e50914]/45 hover:bg-[#e50914]/8"
      : tone === "success"
      ? "hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/8"
      : tone === "gold"
      ? "hover:text-[#e9c349] hover:border-[#e9c349]/40 hover:bg-[#e9c349]/8"
      : "hover:text-[#ffb4aa] hover:border-[#ffb4aa]/40 hover:bg-[#ffb4aa]/8";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border border-[#5e3f3b]/40 p-2 text-[#af8782] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ───────────────────────── Search input ─────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#af8782]/50" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-[#5e3f3b]/40 bg-[#131111] pl-10 pr-4 text-xs text-[#e5e2e1] placeholder:text-[#af8782]/45 transition-all duration-200 focus:border-[#ffb4aa]/60 focus:outline-none focus:ring-2 focus:ring-[#ffb4aa]/15"
      />
    </div>
  );
}

// ───────────────────────── Badge ─────────────────────────

export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral" | "gold";

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
  warning: "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
  error: "bg-[#e50914]/10 text-[#ffb4aa] border-[#e50914]/25",
  info: "bg-blue-500/10 text-blue-300 border-blue-500/25",
  neutral: "bg-white/[0.04] text-[#af8782] border-white/10",
  gold: "bg-[#e9c349]/10 text-[#e9c349] border-[#e9c349]/25",
};

export function Badge({
  tone = "neutral",
  dot = false,
  icon: Icon,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider ${BADGE_TONE_CLASS[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

// ───────────────────────── Stat card ─────────────────────────

export type StatTone = "red" | "gold" | "blue" | "purple" | "green";

const STAT_TONE_CLASS: Record<StatTone, { icon: string; bg: string; value: string }> = {
  red: { icon: "text-[#ff6b61]", bg: "bg-[#e50914]/12", value: "text-[#ffb4aa]" },
  gold: { icon: "text-[#e9c349]", bg: "bg-[#e9c349]/12", value: "text-[#e9c349]" },
  blue: { icon: "text-[#60a5fa]", bg: "bg-[#3b82f6]/12", value: "text-white" },
  purple: { icon: "text-[#c084fc]", bg: "bg-[#a855f7]/12", value: "text-white" },
  green: { icon: "text-emerald-400", bg: "bg-emerald-500/12", value: "text-emerald-400" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "red",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
}) {
  const t = STAT_TONE_CLASS[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] p-5 transition-all duration-300 hover:border-[#5e3f3b]/55 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
    >
      <div className={`mb-3.5 flex h-10 w-10 items-center justify-center rounded-full ${t.bg}`}>
        <Icon className={`h-5 w-5 ${t.icon}`} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#af8782]">{label}</p>
      <p className={`mt-1.5 text-2xl font-black font-headline-lg ${t.value}`}>{value}</p>
    </motion.div>
  );
}

// ───────────────────────── Empty state ─────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#5e3f3b]/25 bg-white/[0.03]">
        <Icon className="h-6 w-6 text-[#5e3f3b]" />
      </div>
      <p className="text-sm font-bold text-[#e9bcb6]/75">{title}</p>
      {message && <p className="max-w-xs text-xs text-[#af8782]/60">{message}</p>}
      {action}
    </div>
  );
}

// ───────────────────────── Skeleton table rows ─────────────────────────

export function SkeletonRows({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-[#5e3f3b]/10">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <div
                className="h-3 animate-pulse rounded bg-white/[0.06]"
                style={{ width: `${50 + ((r * 7 + c * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ───────────────────────── Toast ─────────────────────────

export function Toast({ message, ok = true }: { message: string; ok?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      className={`fixed right-6 top-6 z-[200] flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl ${
        ok ? "border-emerald-500/40 bg-[#123018] text-emerald-300" : "border-red-500/40 bg-[#2b0d0d] text-red-300"
      }`}
    >
      {message}
    </motion.div>
  );
}

// ───────────────────────── Modal shell ─────────────────────────

export function ModalShell({
  onClose,
  maxWidth = "max-w-lg",
  children,
}: {
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`relative my-auto w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(24,22,22,0.96)] shadow-2xl custom-scrollbar`}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ModalHeader({
  icon: Icon,
  title,
  subtitle,
  onClose,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e50914]/25 bg-[#e50914]/15">
            <Icon className="h-4 w-4 text-[#ffb4aa]" />
          </div>
        )}
        <div>
          <h3 className="text-base font-black text-white leading-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[10px] text-[#af8782]/70">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#af8782]/70 transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-6 py-4">
      {children}
    </div>
  );
}

// ───────────────────────── Confirm dialog ─────────────────────────
// Replaces the browser's native confirm() for destructive admin actions (soft
// delete, etc.) with an in-app modal matching the rest of the admin UI.

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-sm">
      <ModalHeader icon={AlertTriangle} title={title} onClose={onCancel} />
      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-[#e9bcb6]/85">{message}</p>
      </div>
      <ModalFooter>
        <SecondaryButton type="button" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </SecondaryButton>
        <PrimaryButton type="button" onClick={onConfirm} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {confirmLabel}
        </PrimaryButton>
      </ModalFooter>
    </ModalShell>
  );
}

// ───────────────────────── Form field label ─────────────────────────

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-[#e9bcb6]/85">
      {children} {required && <span className="text-[#e50914]">*</span>}
    </label>
  );
}

export const inputClass =
  "w-full px-4 py-2.5 bg-[#131111] border border-[#5e3f3b]/40 rounded-lg text-xs text-white placeholder:text-[#af8782]/45 focus:outline-none focus:border-[#ffb4aa]/70 focus:ring-2 focus:ring-[#ffb4aa]/15 transition-all duration-200 [color-scheme:dark]";
