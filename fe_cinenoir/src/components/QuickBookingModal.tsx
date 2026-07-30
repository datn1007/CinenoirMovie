import React, { useEffect } from "react";
import { Movie } from "../types";
import { X } from "lucide-react";
import BookingFlow from "./BookingFlow";

interface QuickBookingModalProps {
  movies: Movie[];
  initialSelectedMovie?: Movie | null;
  currentUser?: { fullName?: string; email?: string; accountId?: string } | null;
  onClose: () => void;
  onWatchMovie?: (movie: Movie) => void;
}

export default function QuickBookingModal({ movies, initialSelectedMovie, currentUser, onClose, onWatchMovie }: QuickBookingModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 md:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1400px] max-h-[94vh] overflow-y-auto rounded-xl border border-white/10 bg-[#141414] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
        <BookingFlow
          movies={movies}
          initialSelectedMovie={initialSelectedMovie}
          currentUser={currentUser}
          onBookingComplete={onClose}
          onWatchMovie={onWatchMovie}
        />
      </div>
    </div>
  );
}
