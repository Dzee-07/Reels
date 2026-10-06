import React, { useState, useEffect, useRef, useCallback } from "react";
import { Star, Heart, Eye, Calendar } from "lucide-react";

/*
  WatchPage
  ---------
  Single video view: player + title/rating/favorite + description + similar videos.

  API used:
    GET  /api/videos/{id}          (also increments the server-side view count)
    GET  /api/videos/{id}/similar
    POST /api/videos/{id}/rating   { stars }                (requires auth)
    POST /api/me/favorites/{id}                              (requires auth, toggle)
    GET  /api/me/favorites                                   (requires auth, to know initial state)
    POST /api/me/watch-history/{id}?progressSeconds=N        (requires auth, periodic + on unmount)

  Reads the video id from the URL path /watch/:id by default, or accepts
  a videoId prop directly if you're wiring this into a router yourself.
*/

const API_BASE = "http://localhost:8080";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isLoggedIn() {
  return Boolean(localStorage.getItem("authToken"));
}

function getVideoIdFromPath() {
  const match = window.location.pathname.match(/\/watch\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------- Building blocks ----------

function StarRating({ value, interactive = false, onRate }) {
  const [hovered, setHovered] = useState(0);
  const full = Math.round(hovered || value);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={interactive ? 20 : 15}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(i)}
          className={`${i <= full ? "fill-amber-400 text-amber-400" : "text-neutral-600"} ${
            interactive ? "cursor-pointer" : ""
          }`}
        />
      ))}
      <span className="text-sm text-neutral-400 ml-1.5">{value.toFixed(1)}</span>
    </div>
  );
}

function SimilarVideoCard({ video }) {
  return (
    <a href={`/watch/${video.id}`} className="flex gap-3 group">
      <div className="relative w-32 shrink-0 rounded-lg overflow-hidden bg-neutral-900">
        <img
          src={video.thumbnailUrl}
          alt=""
          className="w-full aspect-video object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
        <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-neutral-100 px-1 py-0.5 rounded">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-neutral-100 leading-snug line-clamp-2">{video.title}</p>
        <p className="text-xs text-neutral-500 mt-1">{video.uploaderName}</p>
        <StarRating value={video.averageRating} />
      </div>
    </a>
  );
}

// ---------- Page ----------

export default function WatchPage({ videoId }) {
  const id = videoId ?? getVideoIdFromPath();

  const [video, setVideo] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const lastReportedRef = useRef(0);

  useEffect(() => {
    if (!id) {
      setError("No video specified");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [videoData, similarData] = await Promise.all([
          fetch(`${API_BASE}/api/videos/${id}`, { headers: authHeaders() }).then((r) => {
            if (!r.ok) throw new Error("not found");
            return r.json();
          }),
          fetch(`${API_BASE}/api/videos/${id}/similar`, { headers: authHeaders() }).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);
        setVideo(videoData);
        setSimilar(similarData);

        if (isLoggedIn()) {
          try {
            const favs = await fetch(`${API_BASE}/api/me/favorites`, { headers: authHeaders() }).then((r) =>
              r.json()
            );
            setFavorited(favs.some((v) => v.id === videoData.id));
          } catch {
            // non-fatal
          }
        }
      } catch {
        setError("Couldn't load this video.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Record watch progress periodically and on unmount so "videos you've watched" stays accurate.
  const reportProgress = useCallback(
    (progressSeconds) => {
      if (!isLoggedIn() || !id) return;
      fetch(`${API_BASE}/api/me/watch-history/${id}?progressSeconds=${Math.floor(progressSeconds)}`, {
        method: "POST",
        headers: authHeaders(),
      }).catch(() => {});
    },
    [id]
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    function onTimeUpdate() {
      const t = el.currentTime;
      // report roughly every 15s of playback, not on every timeupdate tick
      if (t - lastReportedRef.current >= 15) {
        lastReportedRef.current = t;
        reportProgress(t);
      }
    }

    el.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      if (el.currentTime > 0) reportProgress(el.currentTime);
    };
  }, [reportProgress, video]);

  async function handleRate(stars) {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/videos/${id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ stars }),
      });
      if (res.ok) setVideo(await res.json());
    } catch {
      // silently ignore
    }
  }

  async function toggleFavorite() {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      const res = await fetch(`${API_BASE}/api/me/favorites/${id}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) setFavorited(!next);
    } catch {
      setFavorited(!next);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center">
        <p className="text-neutral-500 text-sm">Loading video...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center px-4">
        <p className="text-neutral-400 text-sm">{error || "Video not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
        {/* Player + details */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={video.videoUrl}
              poster={video.thumbnailUrl}
              controls
              className="w-full aspect-video"
            />
          </div>

          <h1
            className="text-[#F2F0EA] text-xl md:text-2xl font-semibold mt-4"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-4 text-sm text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Eye size={14} />
                {video.viewCount?.toLocaleString()} views
              </span>
              <span>{video.uploaderName}</span>
            </div>

            <div className="flex items-center gap-4">
              <StarRating value={video.averageRating} interactive={isLoggedIn()} onRate={handleRate} />
              <button
                onClick={toggleFavorite}
                className="flex items-center gap-1.5 text-sm text-neutral-300 border border-neutral-800 rounded-full px-3 py-1.5 hover:border-neutral-600 transition-colors"
              >
                <Heart size={15} className={favorited ? "fill-amber-400 text-amber-400" : ""} />
                {favorited ? "Favorited" : "Favorite"}
              </button>
            </div>
          </div>

          {video.description && (
            <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 mt-4">
              <p className="text-sm text-neutral-300 whitespace-pre-line">{video.description}</p>
            </div>
          )}
        </div>

        {/* Similar videos */}
        {similar.length > 0 && (
          <aside className="w-full lg:w-96 shrink-0">
            <h2
              className="text-[#F2F0EA] text-lg font-semibold mb-3"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              More like this
            </h2>
            <div className="flex flex-col gap-4">
              {similar.map((v) => (
                <SimilarVideoCard key={v.id} video={v} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
