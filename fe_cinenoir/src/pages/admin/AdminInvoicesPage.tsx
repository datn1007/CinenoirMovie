import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Receipt, DollarSign, CheckCircle2 } from "lucide-react";
import {
  PageHeader,
  RefreshButton,
  SecondaryButton,
  SearchInput,
  Badge,
  BadgeTone,
  StatCard,
  EmptyState,
  SkeletonRows,
} from "../../components/admin/AdminUI";
import { API_BASE_URL } from "../../lib/apiConfig";
import { formatDate as sharedFormatDate } from "../../lib/formatDate";

interface InvoiceRow {
  id: string;
  bookingDate: string | null;
  movieName: string | null;
  seat: string | null;
  totalMoney: number | null;
  status: number | null;
  accountId?: string | null;
}

const STATUS_MAP: Record<number, { label: string; tone: BadgeTone }> = {
  0: { label: "Đã hủy", tone: "error" },
  1: { label: "Chờ TT", tone: "warning" },
  2: { label: "Đã TT", tone: "success" },
};

function fmt(n: number | null) {
  return n == null ? "—" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

function fmtDate(s: string | null) {
  return sharedFormatDate(s);
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const token = () => localStorage.getItem("cinenoir_jwt_token") ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInvoices(await res.json());
    } catch {
      setError("Không thể tải danh sách hóa đơn. Kiểm tra kết nối backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = invoices.filter((inv) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (inv.movieName ?? "").toLowerCase().includes(q) ||
      (inv.id ?? "").toLowerCase().includes(q) ||
      (inv.seat ?? "").toLowerCase().includes(q)
    );
  });

  const totalRevenue = invoices.reduce((s, inv) => s + (inv.totalMoney ?? 0), 0);
  const paidCount = invoices.filter((inv) => inv.status === 2).length;

  return (
    <section className="space-y-6 animate-fade-in">
      <PageHeader
        title="Hóa Đơn"
        subtitle={loading ? "Đang tải..." : `${invoices.length} hóa đơn · ${paidCount} đã thanh toán`}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Receipt} label="Tổng Hóa Đơn" value={invoices.length} tone="red" />
        <StatCard icon={CheckCircle2} label="Đã Thanh Toán" value={paidCount} tone="green" />
        <StatCard icon={DollarSign} label="Tổng Doanh Thu" value={fmt(totalRevenue)} tone="gold" />
      </div>

      <div className="flex items-center gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Tìm phim, mã HĐ, ghế..." className="max-w-sm flex-1" />
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] h-48 text-[#e9bcb6]/70">
          <AlertCircle className="h-8 w-8 text-[#e50914]" />
          <p className="text-sm">{error}</p>
          <SecondaryButton onClick={load} className="text-[#ffb4aa]">Thử Lại</SecondaryButton>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#5e3f3b]/30 bg-[#201f1f] shadow-xl">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#5e3f3b]/30 bg-[#1a1919]">
                  <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]">Mã HĐ</th>
                  <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]">Phim</th>
                  <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]">Ngày ĐV</th>
                  <th className="px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-[#af8782]">Ghế</th>
                  <th className="px-4 py-3.5 text-right text-[10px] font-black uppercase tracking-widest text-[#af8782]">Tổng Tiền</th>
                  <th className="px-4 py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-[#af8782]">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#5e3f3b]/12">
                {loading ? (
                  <SkeletonRows columns={6} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={Receipt}
                        title={query ? "Không tìm thấy hóa đơn phù hợp." : "Chưa có hóa đơn nào."}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => {
                    const statusInfo = STATUS_MAP[inv.status ?? -1] ?? { label: "Không rõ", tone: "neutral" as BadgeTone };
                    return (
                      <tr key={inv.id} className="transition-colors duration-150 hover:bg-white/[0.03]">
                        <td className="max-w-[100px] truncate px-4 py-3.5 font-mono text-[#e9bcb6]/70" title={inv.id}>{inv.id}</td>
                        <td className="max-w-[160px] truncate px-4 py-3.5 font-semibold text-white" title={inv.movieName ?? ""}>{inv.movieName ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-[#e9bcb6]/70">{fmtDate(inv.bookingDate)}</td>
                        <td className="max-w-[100px] truncate px-4 py-3.5 text-[#e9bcb6]/70" title={inv.seat ?? ""}>{inv.seat ?? "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-white">{fmt(inv.totalMoney)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
