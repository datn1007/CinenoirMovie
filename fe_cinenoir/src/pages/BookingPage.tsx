import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";
import { Movie, CinemaRoom } from "../types";
import { ChevronLeft, Loader2 } from "lucide-react";

import Header from "../components/Header";
import BookingFlow from "../components/BookingFlow";

import { API_BASE_URL } from "../lib/apiConfig";

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentUser, isAdmin, logout } = useAuth();

  const payosMode: "return" | "cancel" | null =
    location.pathname === ROUTES.BOOKING_PAYOS_RETURN
      ? "return"
      : location.pathname === ROUTES.BOOKING_PAYOS_CANCEL
        ? "cancel"
        : null;
  const payosOrderCode = searchParams.get("orderCode");

  const movieId = searchParams.get("movieId");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemaRooms, setCinemaRooms] = useState<CinemaRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/movies`).then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<Movie[]>; }),
      fetch(`${API_BASE_URL}/api/cinema-rooms`).then((r) => { if (!r.ok) throw new Error(); return r.json() as Promise<CinemaRoom[]>; }),
    ])
      .then(([moviesData, roomsData]) => {
        setMovies(moviesData);
        setCinemaRooms(roomsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedMovie = movieId ? (movies.find((m) => m.id === movieId) ?? null) : null;

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#e5e2e1] font-sans antialiased">
      <Header
        currentView="Booking"
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

      <div className="pt-28 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-semibold mb-6 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại danh sách phim
        </button>

        <h2 className="text-white text-3xl font-black mb-8">Đặt Vé</h2>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[#e50914] animate-spin" />
          </div>
        ) : (
          <BookingFlow
            movies={movies}
            initialSelectedMovie={selectedMovie}
            currentUser={currentUser}
            onBookingComplete={() => navigate(ROUTES.HOME)}
            onWatchMovie={(movie) => navigate(`${ROUTES.WATCH}?movieId=${movie.id}`)}
            cinemaRooms={cinemaRooms}
            payosMode={payosMode}
            payosOrderCode={payosOrderCode}
          />
        )}
      </div>
    </div>
  );
}
