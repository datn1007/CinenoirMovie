import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Movie, Voucher } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";

import Header from "../components/Header";
import MovieDetailModal from "../components/MovieDetailModal";
import QuickBookingModal from "../components/QuickBookingModal";

import { Play, Info, ChevronLeft, ChevronRight, Heart, Zap, Copy, Check, Ticket, Star } from "lucide-react";

import { API_BASE_URL } from "../lib/apiConfig";
import { formatDate } from "../lib/formatDate";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const voucherDiscountLabel = (voucher: Voucher) =>
  voucher.discountType === "PERCENTAGE" ? `Giảm ${voucher.discountValue}%` : `Giảm ${money(voucher.discountValue)}`;

const resolveImageUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const toHeroEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com")) videoId = u.searchParams.get("v");
    else if (u.hostname === "youtu.be") videoId = u.pathname.slice(1);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`;
  } catch {
    return null;
  }
};

// Direct (non-YouTube) trailer URL, e.g. an S3 .mp4 link — played as a native background video.
const toHeroVideoUrl = (url?: string): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") return null;
    return url;
  } catch {
    return null;
  }
};


type HomeTab = "home" | "nowShowing" | "comingSoon" | "promotions";

const normalizeStatus = (status?: string) => (status ?? "").trim().toLowerCase().replace(/[_-]/g, " ");

const toDateOnly = (date?: string) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const isNowShowingMovie = (movie: Movie) => {
  const status = normalizeStatus(movie.status);
  if (["now showing", "now showing", "dang chieu", "đang chiếu", "1"].includes(status)) return true;
  if (["coming soon", "starts tomorrow", "sap ra mat", "sắp ra mắt", "2"].includes(status)) return false;

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const fromDate = toDateOnly(movie.fromDate);
  const toDate = toDateOnly(movie.toDate);
  if (fromDate && fromDate > todayOnly) return false;
  if (fromDate && toDate) return fromDate <= todayOnly && todayOnly <= toDate;
  return false;
};

const isComingSoonMovie = (movie: Movie) => !isNowShowingMovie(movie);

// Đánh giá phim (0-5), lưu dạng chuỗi ở BE — hiển thị thành sao vàng/xám kèm số điểm.
function StarRating({ rating }: { rating?: string | null }) {
  const value = rating ? parseFloat(rating) : NaN;
  if (!Number.isFinite(value) || value <= 0) return null;
  const clamped = Math.min(5, Math.max(0, value));
  const filled = Math.round(clamped);
  return (
    <div className="flex items-center gap-1" title={`Đánh giá ${clamped.toFixed(1)}/5`}>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-2.5 h-2.5 ${i < filled ? "fill-[#e9c349] text-[#e9c349]" : "fill-transparent text-white/25"}`}
          />
        ))}
      </div>
      <span className="text-[10px] font-bold text-[#e9c349]">{clamped.toFixed(1)}</span>
    </div>
  );
}
function MovieRow({
  title,
  movies,
  onBook,
  onDetail,
}: {
  title: string;
  movies: Movie[];
  onBook: (m: Movie) => void;
  onDetail: (m: Movie) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    rowRef.current?.scrollBy({ left: dir === "left" ? -600 : 600, behavior: "smooth" });

  if (movies.length === 0) return null;

  return (
    <section className="mb-10 group/row">
      <h2 className="text-white text-xl font-bold px-4 md:px-12 mb-3">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-4 z-10 w-12 bg-gradient-to-r from-[#141414] to-transparent text-white items-center justify-center hidden group-hover/row:flex transition-all hover:from-black"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <div
          ref={rowRef}
          className="flex gap-2 overflow-x-auto pl-4 md:pl-12 pr-4 md:pr-12 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="relative group/card flex-none w-[150px] sm:w-[180px] cursor-pointer"
              onClick={() => onBook(movie)}
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg transition-transform duration-200 group-hover/card:scale-105 shadow group-hover/card:shadow-2xl">
                <img src={resolveImageUrl(movie.imageUrl)} alt={movie.title} className="w-full h-full object-cover" />
                {/* Always-visible quick-book chip — hover overlay below is a pointer-only enhancement,
                    since :hover never fires on touch and the card would otherwise be untappable. */}
                <button
                  onClick={(e) => { e.stopPropagation(); onBook(movie); }}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
                  aria-label={`Đặt vé ${movie.title}`}
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  <p className="text-white font-bold text-xs leading-tight mb-2 line-clamp-2">{movie.title}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={movie.rating} />
                    <span className="text-white/60 text-[10px]">{movie.duration}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onBook(movie); }}
                      className="flex-1 bg-white text-black text-[10px] font-black py-1.5 rounded hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-black" /> Đặt Vé
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDetail(movie); }}
                      className="bg-white/20 text-white px-2 py-1.5 rounded hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-white/60 text-xs mt-1.5 truncate px-0.5 group-hover/card:text-white transition-colors">
                {movie.title}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-4 z-10 w-12 bg-gradient-to-l from-[#141414] to-transparent text-white items-center justify-center hidden group-hover/row:flex transition-all hover:from-black"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </section>
  );
}

function MovieGrid({
  title,
  movies,
  onBook,
  onDetail,
}: {
  title: string;
  movies: Movie[];
  onBook: (m: Movie) => void;
  onDetail: (m: Movie) => void;
}) {
  return (
    <section className="px-4 md:px-12 pb-16">
      <h1 className="text-white text-3xl md:text-4xl font-black mb-8">{title}</h1>
      {movies.length === 0 ? (
        <div className="border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-white/45 text-base">Hiện chưa có phim nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="group/card cursor-pointer"
              onClick={() => onBook(movie)}
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow transition-transform duration-200 group-hover/card:scale-[1.03] group-hover/card:shadow-2xl">
                <img src={resolveImageUrl(movie.imageUrl)} alt={movie.title} className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); onBook(movie); }}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
                  aria-label={`Đặt vé ${movie.title}`}
                >
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  <p className="text-white font-bold text-sm leading-tight mb-2 line-clamp-2">{movie.title}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onBook(movie); }}
                      className="flex-1 bg-white text-black text-[10px] font-black py-1.5 rounded hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-black" /> Đặt Vé
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDetail(movie); }}
                      className="bg-white/20 text-white px-2 py-1.5 rounded hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-white/70 text-sm font-semibold mt-2 truncate group-hover/card:text-white transition-colors">
                {movie.title}
              </p>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-white/40 text-xs truncate">{movie.genre}</p>
                <StarRating rating={movie.rating} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PosterSkeletonGrid({ title }: { title?: string }) {
  return (
    <section className="px-4 md:px-12 pb-16">
      {title && <div className="h-8 w-56 rounded bg-white/[0.06] animate-pulse mb-8" />}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-white/[0.06] animate-pulse mt-2.5" />
            <div className="h-3 w-1/2 rounded bg-white/[0.05] animate-pulse mt-1.5" />
          </div>
        ))}
      </div>
    </section>
  );
}

function VoucherCoupon({ voucher }: { voucher: Voucher }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — nothing to do, the code is still visible to copy by hand.
    }
  };

  return (
    <article className="relative flex overflow-hidden rounded-lg border border-dashed border-[#e50914]/40 bg-white/[0.04]">
      <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-[#e50914]/40 bg-[#e50914]/10 px-2 py-4">
        <Ticket className="h-6 w-6 text-[#e50914]" />
        <span className="text-center text-[11px] font-black uppercase leading-tight text-[#e50914]">
          {voucherDiscountLabel(voucher)}
        </span>
      </div>
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-base font-black tracking-widest text-white">{voucher.code}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1 rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase text-white/70 transition-colors hover:border-[#e50914]/60 hover:text-white"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Đã chép" : "Chép mã"}
          </button>
        </div>
        {voucher.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/60">{voucher.description}</p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
          {voucher.minOrderValue != null && voucher.minOrderValue > 0 && (
            <span>Đơn tối thiểu {money(voucher.minOrderValue)}</span>
          )}
          {voucher.validTo && <span>Hạn dùng: {formatDate(voucher.validTo)}</span>}
        </div>
      </div>
    </article>
  );
}

function PromotionList({ vouchers }: { vouchers: Voucher[] }) {
  return (
    <section className="px-4 md:px-12 pb-16">
      <h1 className="text-white text-3xl md:text-4xl font-black mb-8">Khuyến Mãi</h1>
      {vouchers.length === 0 ? (
        <div className="border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <p className="text-white/45 text-base">Hiện chưa có mã giảm giá nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {vouchers.map((voucher) => (
            <VoucherCoupon key={voucher.id} voucher={voucher} />
          ))}
        </div>
      )}
    </section>
  );
}
// Maps each Home tab to its real, bookmarkable URL — the reverse of the lookup below.
const TAB_TO_ROUTE: Record<HomeTab, string> = {
  home: ROUTES.HOME,
  nowShowing: ROUTES.HOME_NOW_SHOWING,
  comingSoon: ROUTES.HOME_COMING_SOON,
  promotions: ROUTES.HOME_PROMOTIONS,
};

const ROUTE_TO_TAB: Record<string, HomeTab> = {
  [ROUTES.HOME_NOW_SHOWING]: "nowShowing",
  [ROUTES.HOME_COMING_SOON]: "comingSoon",
  [ROUTES.HOME_PROMOTIONS]: "promotions",
};

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdmin, isStaff, logout } = useAuth();

  
  useEffect(() => {
    if (isAdmin) navigate(ROUTES.ADMIN, { replace: true });
  }, [isAdmin, navigate]);

  // Derived from the URL, not local state — so the tab survives a refresh,
  // works with browser back/forward, and can be linked to directly.
  const activeTab: HomeTab = ROUTE_TO_TAB[location.pathname] ?? "home";

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [detailMovieModal, setDetailMovieModal] = useState<Movie | null>(null);
  const [quickBookingMovie, setQuickBookingMovie] = useState<Movie | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/movies`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: Movie[]) => setMovies(data))
      .catch(() => {})
      .finally(() => setLoadingMovies(false));

    fetch(`${API_BASE_URL}/api/vouchers/active`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: Voucher[]) => setVouchers(data))
      .catch(() => {});
  }, []);

  const openBookingForMovie = (movie: Movie) => {
    if (!currentUser) {
      navigate(ROUTES.LOGIN, { state: { pendingMovieId: movie.id } });
      return;
    }
    navigate(`${ROUTES.BOOKING}?movieId=${movie.id}`);
  };

  const openQuickBooking = (movie: Movie) => {
    if (!currentUser) {
      navigate(ROUTES.LOGIN, { state: { pendingMovieId: movie.id } });
      return;
    }
    setQuickBookingMovie(movie);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  const filteredMovies = movies.filter((m) =>
    (m.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.genre ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const nowShowingMovies = filteredMovies.filter(isNowShowingMovie);
  const comingSoonMovies = filteredMovies.filter(isComingSoonMovie);
  const heroMovie = movies[0];

  const handleHomeTabChange = (tab: HomeTab) => {
    navigate(TAB_TO_ROUTE[tab]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#e5e2e1] font-sans antialiased overflow-x-hidden flex flex-col justify-between">
      <div className="flex-grow flex flex-col justify-between">
        <Header
          currentView="Home"
          activeHomeTab={activeTab}
          onHomeTabChange={handleHomeTabChange}
          onNavigate={(view) => {
            if (view === "Login") navigate(ROUTES.LOGIN);
            else if (view === "Register") navigate(ROUTES.REGISTER);
            else if (view === "Dashboard") {
              if (isAdmin) navigate(ROUTES.ADMIN);
              else if (isStaff) navigate(ROUTES.STAFF);
            }
          }}
          isLoggedIn={currentUser !== null}
          userRole={currentUser?.role}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
          currentUser={currentUser}
          onViewProfile={() => navigate(ROUTES.PROFILE)}
          onScrollToSection={(sectionId) => {
            setTimeout(() => {
              document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
        />

        {activeTab === "home" && (
          <section className="relative w-full min-h-[85vh] flex items-end">
            <div className="absolute inset-0 overflow-hidden">
              {(() => {
                const heroEmbed = toHeroEmbedUrl(heroMovie?.trailerUrl);
                if (heroEmbed) {
                  return (
                    <iframe
                      src={heroEmbed}
                      className="absolute border-0 pointer-events-none"
                      style={{
                        top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "calc(177.78vh)", height: "calc(56.25vw)",
                        minWidth: "100%", minHeight: "100%",
                      }}
                      allow="autoplay; encrypted-media"
                      title="Trailer"
                    />
                  );
                }
                const heroVideo = toHeroVideoUrl(heroMovie?.trailerUrl);
                if (heroVideo) {
                  return (
                    <video
                      src={heroVideo}
                      className="w-full h-full object-cover pointer-events-none"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  );
                }
                return heroMovie?.imageUrl ? (
                  <img
                    src={resolveImageUrl(heroMovie.imageUrl)}
                    alt={heroMovie.title}
                    className="w-full h-full object-cover object-top select-none pointer-events-none"
                  />
                ) : (
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQyf4zsq6kx50ftYJ8aBZe-NWGiatSajlXUDKk0IacHXsI0PPDU6BbZ4c6ciMr14xIvekIvxgTrR81EDFLQo3SBjl58E7ghPSzE1Bg_qr4h6CVmRLow8B7_H60rOXhKnmBnXrYgju6P3vl7wuT3yebM04NYadLi4R8C6N6ZiihFQZD9flpuWrzJkY9pCueBcdS26amO222IBbpNzaCY69jEvZFt2lQyIxgAwpcoaPSTSpiBDdY0wVO2-kebAFdgJycNdDq9OiRV9DK"
                    alt="Cinema backdrop"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/30" />
            </div>

            <div className="relative z-10 w-full max-w-3xl px-6 md:px-12 pb-20 md:pb-28 space-y-5">
              {heroMovie && (
                <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
                  <span className="text-[#e50914] font-black text-xs tracking-widest uppercase border border-[#e50914]/40 px-2 py-0.5">
                    #1 ĐANG CHIẾU
                  </span>
                  <span>{heroMovie.genre}</span>
                  <span>·</span>
                  <span>{heroMovie.duration}</span>
                </div>
              )}
              <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight">
                {heroMovie?.title ?? "CINENOIR"}
              </h1>
              {heroMovie?.synopsis && (
                <p className="text-white/75 text-base md:text-lg max-w-xl leading-relaxed line-clamp-3">
                  {heroMovie.synopsis}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Primary — the main path into the booking flow */}
                <button
                  onClick={() => heroMovie && openBookingForMovie(heroMovie)}
                  disabled={!heroMovie}
                  className="flex items-center gap-2.5 bg-[#e50914] text-white px-8 py-3 rounded font-bold text-base shadow-[0_8px_24px_rgba(229,9,20,0.35)] hover:brightness-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Đặt Vé
                </button>
                {/* Secondary — an alternate, faster entry point into the same booking flow */}
                <button
                  onClick={() => heroMovie && openQuickBooking(heroMovie)}
                  disabled={!heroMovie}
                  className="flex items-center gap-2.5 border border-white/70 text-white px-6 py-3 rounded font-bold text-sm hover:bg-white/10 active:scale-95 transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Zap className="w-4 h-4" />
                  Mua Vé Nhanh
                </button>
                {/* Ghost — informational, lowest visual weight */}
                <button
                  onClick={() => heroMovie && setDetailMovieModal(heroMovie)}
                  disabled={!heroMovie}
                  className="flex items-center gap-2 text-white/80 px-3 py-3 font-semibold text-sm hover:text-white active:scale-95 transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 rounded"
                >
                  <Info className="w-4 h-4" />
                  Chi Tiết
                </button>
              </div>
            </div>
          </section>
        )}

        <div id="movies-catalog" className={`relative z-10 bg-[#141414] ${activeTab === "home" ? "-mt-24" : "pt-36 md:pt-28"}`}>
          <div className="pt-4 pb-16">
            {loadingMovies && activeTab !== "promotions" ? (
              activeTab === "home" ? (
                <>
                  <PosterSkeletonGrid title="Phim Đang Chiếu" />
                  <PosterSkeletonGrid title="Sắp Ra Mắt" />
                </>
              ) : (
                <PosterSkeletonGrid title={activeTab === "nowShowing" ? "Phim Đang Chiếu" : "Sắp Ra Mắt"} />
              )
            ) : activeTab !== "promotions" && filteredMovies.length === 0 && searchTerm ? (
              <div className="px-12 py-20 text-center">
                <p className="text-white/40 text-lg">
                  Không tìm thấy phim nào cho "<span className="text-white">{searchTerm}</span>"
                </p>
              </div>
            ) : activeTab === "home" ? (
              <>
                <div id="now-showing">
                  <MovieRow
                    title="Phim Đang Chiếu"
                    movies={nowShowingMovies}
                    onBook={openBookingForMovie}
                    onDetail={(m) => setDetailMovieModal(m)}
                  />
                </div>
                <div id="coming-soon">
                  <MovieRow
                    title="Sắp Ra Mắt"
                    movies={comingSoonMovies}
                    onBook={openBookingForMovie}
                    onDetail={(m) => setDetailMovieModal(m)}
                  />
                </div>
                <MovieRow
                  title="Tất Cả Phim"
                  movies={filteredMovies}
                  onBook={openBookingForMovie}
                  onDetail={(m) => setDetailMovieModal(m)}
                />
              </>
            ) : activeTab === "nowShowing" ? (
              <MovieGrid
                title="Phim Đang Chiếu"
                movies={nowShowingMovies}
                onBook={openBookingForMovie}
                onDetail={(m) => setDetailMovieModal(m)}
              />
            ) : activeTab === "comingSoon" ? (
              <MovieGrid
                title="Sắp Ra Mắt"
                movies={comingSoonMovies}
                onBook={openBookingForMovie}
                onDetail={(m) => setDetailMovieModal(m)}
              />
            ) : (
              <PromotionList vouchers={vouchers} />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#141414] border-t border-white/5 py-12 select-none">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <p className="text-[#e50914] font-black text-xl tracking-tighter mb-6">CINENOIR</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-[#737373] mb-10">
              <div className="space-y-3">
                <p className="text-white/50 font-semibold">Khám Phá</p>
                <p className="hover:text-white cursor-pointer transition-colors">Phim Đang Chiếu</p>
                <p className="hover:text-white cursor-pointer transition-colors">Sắp Ra Mắt</p>
                <p className="hover:text-white cursor-pointer transition-colors">Khuyến Mãi</p>
              </div>
              <div className="space-y-3">
                <p className="text-white/50 font-semibold">Hỗ Trợ</p>
                <p className="hover:text-white cursor-pointer transition-colors">Trung Tâm Hỗ Trợ</p>
                <p className="hover:text-white cursor-pointer transition-colors">Liên Hệ</p>
                <p className="hover:text-white cursor-pointer transition-colors">FAQ</p>
              </div>
              <div className="space-y-3">
                <p className="text-white/50 font-semibold">Rạp Chiếu</p>
                <p className="hover:text-white cursor-pointer transition-colors">Số 408 Đại Lộ Nghệ Thuật</p>
                <p className="hover:text-white cursor-pointer transition-colors">Hotline: 1900 1234</p>
                <p className="hover:text-white cursor-pointer transition-colors">10:00 – 24:00 hàng ngày</p>
              </div>
              <div className="space-y-3">
                <p className="text-white/50 font-semibold">Theo Dõi</p>
                <p className="hover:text-white cursor-pointer transition-colors">Facebook</p>
                <p className="hover:text-white cursor-pointer transition-colors">Instagram</p>
                <p className="hover:text-white cursor-pointer transition-colors">TikTok</p>
              </div>
            </div>
            <p className="text-[#737373] text-xs flex items-center gap-1.5">
              © 2026 CineNoir Cinemas.
              <Heart className="w-3 h-3 text-[#e50914] fill-[#e50914]" />
              Xây dựng với đam mê.
            </p>
          </div>
        </footer>

        {detailMovieModal && (
          <MovieDetailModal
            movie={detailMovieModal}
            onClose={() => setDetailMovieModal(null)}
            onBook={(m) => { setDetailMovieModal(null); openBookingForMovie(m); }}
          />
        )}

        {quickBookingMovie && (
          <QuickBookingModal
            movies={movies}
            initialSelectedMovie={quickBookingMovie}
            currentUser={currentUser}
            onClose={() => setQuickBookingMovie(null)}
            onWatchMovie={(movie) => {
              setQuickBookingMovie(null);
              navigate(`${ROUTES.WATCH}?movieId=${movie.id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
