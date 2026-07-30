import React, { useEffect, useState } from "react";
import { Movie } from "../types";
import { X, Play, Loader2, Film } from "lucide-react";

import { API_BASE_URL } from "../lib/apiConfig";
import { formatDate as sharedFormatDate } from "../lib/formatDate";

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
  onBook: (movie: Movie) => void;
}

const resolveImageUrl = (path?: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatDuration = (minutes?: number) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} phút`;
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
};

const formatDate = (value?: string) => (value ? sharedFormatDate(value) : null);

const isYouTubeUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.hostname.includes("youtube.com") || u.hostname === "youtu.be";
  } catch {
    return false;
  }
};

// Converts YouTube watch URL or youtu.be short URL to embed URL.
// Any other URL (e.g. a direct S3 .mp4 link) is returned unchanged and
// played with a native <video> tag instead of an iframe — see isYouTubeUrl.
const toEmbedUrl = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}?autoplay=1`;
    }
  } catch {
    // not a valid URL — fall through
  }
  return url;
};

const statusLabel: Record<string, string> = {
  "Now Showing": "Đang Chiếu",
  "Starts Tomorrow": "Khởi Chiếu Ngày Mai",
  "Coming Soon": "Sắp Ra Mắt",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-[#8c8c8c] w-auto min-w-[92px] shrink-0 font-semibold">{label}</span>
      <span className="text-white/90">{value}</span>
    </div>
  );
}

export default function MovieDetailModal({ movie, onClose, onBook }: MovieDetailModalProps) {
  const [detail, setDetail] = useState<Movie | null>(movie);
  const [loading, setLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    setDetail(movie);
    setShowTrailer(false);
    if (!movie) return;

    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/movies/${movie.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Movie) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        // Keep showing the data we already had from the catalog list.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [movie]);

  useEffect(() => {
    if (!movie) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showTrailer) setShowTrailer(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [movie, onClose, showTrailer]);

  if (!movie || !detail) return null;

  const synopsis = detail.synopsis || detail.description;
  const durationLabel = formatDuration(detail.duration);
  const premiereDate = formatDate(detail.fromDate);
  const embedUrl = detail.trailerUrl ? toEmbedUrl(detail.trailerUrl) : null;
  const trailerIsYouTube = detail.trailerUrl ? isYouTubeUrl(detail.trailerUrl) : false;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-[#181818] w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl shadow-2xl relative border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8">
            {/* Poster */}
            <div className="w-full md:w-[200px] shrink-0">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#0d0d0d] shadow-xl ring-1 ring-white/10">
                {detail.imageUrl && (
                  <img
                    src={resolveImageUrl(detail.imageUrl)}
                    alt={detail.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {detail.status && (
                  <span className="text-[#e50914] font-black text-[10px] tracking-widest uppercase border border-[#e50914]/40 bg-[#e50914]/10 px-2 py-0.5 rounded-sm">
                    {statusLabel[detail.status] ?? detail.status}
                  </span>
                )}
                {detail.isVip && (
                  <span className="text-[#e9c349] font-black text-[10px] tracking-widest uppercase border border-[#e9c349]/40 px-2 py-0.5 rounded-sm">
                    VIP
                  </span>
                )}
                {detail.isImax && (
                  <span className="text-white font-black text-[10px] tracking-widest uppercase border border-white/30 px-2 py-0.5 rounded-sm">
                    IMAX
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-white text-2xl md:text-3xl font-black leading-tight">{detail.title}</h2>
                {detail.titleEnglish && detail.titleEnglish !== detail.title && (
                  <p className="text-white/45 text-sm mt-0.5">{detail.titleEnglish}</p>
                )}
              </div>

              <div className="h-px bg-white/10" />

              <div className="space-y-2">
                <InfoRow label="Đạo diễn" value={detail.director} />
                <InfoRow label="Diễn viên" value={detail.actor} />
                <InfoRow label="Thể loại" value={detail.genre} />
                <InfoRow label="Khởi chiếu" value={premiereDate} />
                <InfoRow label="Thời lượng" value={durationLabel} />
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => onBook(detail)}
                  className="flex items-center justify-center gap-2.5 bg-[#e50914] hover:bg-[#c11119] text-white px-8 py-3 rounded font-bold text-sm uppercase tracking-wide transition-colors active:scale-95 shadow-[0_4px_14px_rgba(229,9,20,0.35)]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Đặt Vé
                </button>

                {embedUrl && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded font-bold text-sm uppercase tracking-wide transition-colors active:scale-95 border border-white/20"
                  >
                    <Film className="w-4 h-4" />
                    Trailer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Synopsis */}
          {synopsis && (
            <div className="border-t border-white/10 px-6 md:px-8 py-6">
              <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2.5">
                Nội Dung Phim
              </h3>
              <p className="text-white/75 text-sm leading-relaxed">{synopsis}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-white/30 text-xs px-6 md:px-8 pb-5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang tải thông tin mới nhất...
            </div>
          )}
        </div>
      </div>

      {/* Trailer overlay */}
      {showTrailer && embedUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setShowTrailer(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
              {trailerIsYouTube ? (
                <iframe
                  src={embedUrl}
                  title={`Trailer: ${detail.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video
                  src={embedUrl ?? undefined}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
