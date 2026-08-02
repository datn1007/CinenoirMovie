import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import { Movie } from "../types";
import { ChevronLeft, Loader2, VideoOff } from "lucide-react";

import Header from "../components/Header";
import { API_BASE_URL } from "../lib/apiConfig";

// movieUrl có thể là URL S3 tuyệt đối (phim cũ) hoặc đường dẫn tương đối tới file đã
// upload lên server (/uploads/movies/...) — cần ghép với API_BASE_URL để phát đúng nguồn.
const resolveMovieSrc = (url?: string) => (!url ? "" : url.startsWith("http") ? url : `${API_BASE_URL}${url}`);

const ONLINE_ACCESS_HOURS = 24;
const authHeaders = () => {
  const token = localStorage.getItem("cinenoir_jwt_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function WatchMoviePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, isAdmin, logout } = useAuth();

  const movieId = searchParams.get("movieId");
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!movieId) {
      setErrorText("Không tìm thấy phim.");
      setLoading(false);
      return;
    }
    if (!currentUser?.accountId) {
      setErrorText("Bạn cần đăng nhập để xem phim.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE_URL}/api/movies/${movieId}`).then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<Movie>;
      }),
      // Vé xem online là mua 1 lần, có hiệu lực 24 giờ kể từ lúc thanh toán (paidAt) — kiểm tra
      // lại đúng vé đã mua cho phim này còn hạn không, không dựa vào việc đã đăng nhập là đủ.
      fetch(`${API_BASE_URL}/api/bookings/search?accountId=${encodeURIComponent(currentUser.accountId)}`, {
        headers: authHeaders(),
      }).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([movieData, bookings]: [Movie, Array<{ movieId?: string; ticketMode?: string; paymentStatus?: string; paidAt?: string }>]) => {
        if (cancelled) return;
        setMovie(movieData);
        const hasValidAccess = bookings.some(
          (b) =>
            b.ticketMode === "ONLINE" &&
            b.paymentStatus === "PAID" &&
            b.movieId === movieId &&
            b.paidAt != null &&
            Date.now() - new Date(b.paidAt).getTime() < ONLINE_ACCESS_HOURS * 60 * 60 * 1000
        );
        setAccessDenied(!hasValidAccess);
      })
      .catch(() => {
        if (!cancelled) setErrorText("Không thể tải thông tin phim.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, currentUser?.accountId]);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#e5e2e1] font-sans antialiased">
      <Header
        currentView="Home"
        onNavigate={(view) => {
          if (view === "Home") navigate(ROUTES.HOME);
          else if (view === "Login") navigate(ROUTES.LOGIN);
          else if (view === "Register") navigate(ROUTES.REGISTER);
          else if (view === "Dashboard") navigate(ROUTES.ADMIN);
        }}
        isLoggedIn={!!currentUser}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        currentUser={currentUser}
        onViewProfile={() => navigate(ROUTES.PROFILE)}
      />

      <div className="pt-28 pb-16 px-6 md:px-12 max-w-5xl mx-auto">
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-semibold mb-6 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại danh sách phim
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[#e50914] animate-spin" />
          </div>
        ) : errorText || !movie ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center text-[#af8782]">
            <VideoOff className="w-10 h-10" />
            <p className="text-sm font-semibold">{errorText || "Không tìm thấy phim."}</p>
          </div>
        ) : !movie.movieUrl ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center text-[#af8782]">
            <VideoOff className="w-10 h-10" />
            <p className="text-sm font-semibold">Phim "{movie.title}" chưa có bản xem online.</p>
          </div>
        ) : accessDenied ? (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-center text-[#af8782]">
            <VideoOff className="w-10 h-10" />
            <p className="text-sm font-semibold">
              Bạn chưa mua vé xem online cho phim "{movie.title}", hoặc vé đã hết hạn (chỉ có hiệu lực 24 giờ kể từ lúc thanh toán).
            </p>
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.BOOKING}?movieId=${movieId}`)}
              className="mt-2 rounded-lg bg-[#e50914] px-4 py-2 text-xs font-black uppercase text-white hover:brightness-110"
            >
              Mua Vé Xem Online
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-white text-2xl md:text-3xl font-black mb-4">{movie.title}</h2>
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
              <video
                src={resolveMovieSrc(movie.movieUrl)}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
            {movie.synopsis && (
              <p className="mt-6 text-sm text-white/70 leading-relaxed">{movie.synopsis}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
