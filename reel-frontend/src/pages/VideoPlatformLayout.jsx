import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search, User, Star, Play, Menu, X, Clock, Flame, Heart,
  ChevronRight, ChevronLeft, Facebook, Twitter, Instagram, Youtube,
  Plus, Pencil, Trash2, GripVertical, Crown, Check, AlertCircle, UploadCloud,
  ImageIcon, ArrowLeft, ListVideo,
} from "lucide-react";

/*
  VideoPlatformLayout — same interface for every role, now with episodes
  --------------------------------------------------------------------
  - "Preview as" switcher at the top (remove once wired to real login).
  - Adding a video now requires a thumbnail upload upfront (no more
    auto-generated placeholder thumbnails) and supports one or more
    episodes under a single title/thumbnail — like a show.
  - Clicking any video (hero, Top 10, or grid) opens a watch view with
    an episode list; picking an episode "plays" it in the player area.
    This preview switches an in-page view since there's no router here —
    in the real app this becomes an actual /watch/:id route (see the
    earlier WatchPage.jsx) that takes an episode id in the URL too.
*/

// ---------- Sample data ----------

function makeEpisodes(titles) {
  return titles.map((t, i) => ({ id: `${Math.random()}`, title: t.title, duration: t.duration }));
}

const INITIAL_VIDEOS = [
  { id: 1, title: "Naruto Shippuden", channel: "Anime Central", views: "2.1M", rating: 4.8, thumb: "https://picsum.photos/seed/naruto/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Episode 1 — Homecoming", duration: "12:04" }, { title: "Episode 2 — The Akatsuki", duration: "11:48" }]) },
  { id: 2, title: "Narnia: The Lion, the Witch and the Wardrobe — Explained", channel: "Story Deep Dive", views: "980K", rating: 4.6, thumb: "https://picsum.photos/seed/narnia/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Full explainer", duration: "18:22" }]) },
  { id: 3, title: "How Cookies Are Made — Factory Tour", channel: "Foodworks", views: "3.4M", rating: 4.9, thumb: "https://picsum.photos/seed/cookies/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Full tour", duration: "9:41" }]) },
  { id: 4, title: "Chocolate Chip Cookies From Scratch", channel: "Baker's Table", views: "1.2M", rating: 4.7, thumb: "https://picsum.photos/seed/choccookie/400/225", isPremium: true,
    episodes: makeEpisodes([{ title: "Full recipe", duration: "14:10" }]) },
  { id: 5, title: "Late Night Coding Session", channel: "DevAfterDark", views: "410K", rating: 4.3, thumb: "https://picsum.photos/seed/coding/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Full session", duration: "45:02" }]) },
  { id: 6, title: "Ocean Documentary", channel: "Blue Planet Archive", views: "5.6M", rating: 4.9, thumb: "https://picsum.photos/seed/ocean/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Episode 1 — Life at 3000m", duration: "26:15" }, { title: "Episode 2 — The Trenches", duration: "24:08" }]) },
  { id: 7, title: "Guitar Basics for Beginners", channel: "Six Strings", views: "760K", rating: 4.4, thumb: "https://picsum.photos/seed/guitar/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Full lesson", duration: "11:33" }]) },
  { id: 8, title: "City Timelapse — Tokyo at Night", channel: "Urban Frames", views: "2.9M", rating: 4.8, thumb: "https://picsum.photos/seed/tokyo/400/225", isPremium: false,
    episodes: makeEpisodes([{ title: "Full timelapse", duration: "6:09" }]) },
];

const FEATURED_VIDEOS = [INITIAL_VIDEOS[5], INITIAL_VIDEOS[2], INITIAL_VIDEOS[0]];
const SLIDE_INTERVAL_MS = 5000;
const PAGE_SIZE = 8;

const SEARCH_SUGGESTIONS = [
  "naruto", "naruto shippuden", "narnia", "narrative essay tips",
  "cookies recipe", "cookie clicker", "coding tutorial", "cooking basics",
  "ocean documentary", "guitar lessons", "tokyo travel guide",
];
const POPULAR_SEARCHES = ["cookies", "naruto", "ocean documentary", "guitar lessons"];

let nextId = 100;

// ---------- Small shared building blocks ----------

function Banner({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${isError ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
      {isError ? <AlertCircle size={14} /> : <Check size={14} />}
      {message}
    </div>
  );
}

function StarRating({ value, interactive = false, onRate }) {
  const [hovered, setHovered] = useState(0);
  const full = Math.round(hovered || value);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={interactive ? 15 : 13}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={(e) => {
            if (!interactive) return;
            e.preventDefault();
            onRate?.(i);
          }}
          className={`${i <= full ? "fill-amber-400 text-amber-400" : "text-neutral-600"} ${interactive ? "cursor-pointer" : ""}`}
        />
      ))}
      <span className="text-xs text-neutral-400 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

function FavoriteButton({ favorited, onToggle }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="shrink-0"
    >
      <Heart size={16} className={favorited ? "fill-amber-400 text-amber-400" : "text-neutral-500 hover:text-neutral-300"} />
    </button>
  );
}

// ---------- Header / search ----------

function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return SEARCH_SUGGESTIONS.filter((s) => s.startsWith(q)).slice(0, 6);
  }, [query]);

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 focus-within:border-amber-500/60 transition-colors">
        <Search size={16} className="text-neutral-500 shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search videos"
          className="bg-transparent outline-none text-sm text-neutral-100 placeholder-neutral-500 w-full"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X size={14} className="text-neutral-500 hover:text-neutral-300" />
          </button>
        )}
      </div>

      {open && (query ? suggestions.length > 0 : true) && (
        <div className="absolute mt-2 w-full bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl z-30">
          {query ? (
            suggestions.map((s) => (
              <button key={s} onClick={() => { setQuery(s); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 flex items-center gap-2">
                <Search size={13} className="text-neutral-500" />
                {s}
              </button>
            ))
          ) : (
            <div className="py-1">
              <p className="px-4 pt-2 pb-1 text-[11px] tracking-wide text-neutral-500">Popular searches</p>
              {POPULAR_SEARCHES.map((s) => (
                <button key={s} onClick={() => { setQuery(s); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 flex items-center gap-2">
                  <Flame size={13} className="text-amber-500" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ role, onLogoClick }) {
  const label = role === "ADMIN" ? "Admin" : role === "SUB_ADMIN" ? "Sub-admin" : "JS";
  return (
    <header className="sticky top-0 z-40 bg-[#0E0E10]/95 backdrop-blur border-b border-neutral-900">
      <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">
        <button className="md:hidden text-neutral-300" aria-label="Menu">
          <Menu size={22} />
        </button>
        <button onClick={onLogoClick} className="text-2xl font-semibold text-[#F2F0EA] tracking-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Reel<span className="text-amber-400">.</span>
        </button>

        <div className="hidden md:flex flex-1 justify-center">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {role !== "USER" && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
              <Crown size={11} />
              {role === "ADMIN" ? "Admin" : "Sub-admin"}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-[#3D7A70] flex items-center justify-center text-xs font-medium text-white">
            {role === "USER" ? "JS" : label[0]}
          </div>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  );
}

// ---------- Featured carousel (same for every role) ----------

function FeaturedCarousel({ videos, onOpen }) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef(null);
  const dragStartX = useRef(0);
  const widthRef = useRef(0);

  const goTo = useCallback((i) => setIndex((i + videos.length) % videos.length), [videos.length]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (isDragging) return;
    const timer = setTimeout(goNext, SLIDE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [index, isDragging, goNext]);

  function handleDragStart(clientX) {
    dragStartX.current = clientX;
    widthRef.current = trackRef.current?.offsetWidth || 1;
    setIsDragging(true);
  }
  function handleDragMove(clientX) {
    if (!isDragging) return;
    setDragOffset(clientX - dragStartX.current);
  }
  function handleDragEnd() {
    if (!isDragging) return;
    const threshold = widthRef.current * 0.15;
    if (dragOffset < -threshold) goNext();
    else if (dragOffset > threshold) goPrev();
    setDragOffset(0);
    setIsDragging(false);
  }

  const translatePercent = -index * 100 + (dragOffset / (widthRef.current || 1)) * 100;

  return (
    <section
      className="relative w-full h-[46vh] min-h-[280px] max-h-[460px] overflow-hidden select-none"
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
    >
      <div
        ref={trackRef}
        className="flex h-full"
        style={{
          width: `${videos.length * 100}%`,
          transform: `translateX(${translatePercent / videos.length}%)`,
          transition: isDragging ? "none" : "transform 500ms ease-out",
        }}
      >
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={(e) => { if (Math.abs(dragOffset) <= 5) onOpen(video); }}
            className="relative h-full shrink-0 text-left"
            style={{ width: `${100 / videos.length}%` }}
          >
            <img src={video.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] via-[#0E0E10]/50 to-transparent" />
            <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-8">
              <p className="text-amber-400 text-xs font-medium tracking-wide mb-2">Featured</p>
              <h1 className="text-white text-2xl md:text-4xl font-semibold max-w-xl leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {video.title}
              </h1>
              <p className="text-neutral-300 text-sm mt-2">{video.channel} · {video.views} views</p>
              <span className="mt-4 w-fit inline-flex items-center gap-2 bg-amber-400 text-neutral-900 font-medium text-sm px-5 py-2.5 rounded-full hover:bg-amber-300 transition-colors">
                <Play size={16} fill="currentColor" />
                Play now
              </span>
            </div>
          </button>
        ))}
      </div>

      <button onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous featured video" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors z-10">
        <ChevronLeft size={18} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next featured video" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors z-10">
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
        {videos.map((v, i) => (
          <button key={v.id} onClick={(e) => { e.stopPropagation(); goTo(i); }} aria-label={`Go to featured video ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-amber-400" : "w-1.5 bg-white/40 hover:bg-white/60"}`} />
        ))}
      </div>
    </section>
  );
}

// ---------- Top 10 rail (same for every role) ----------

function Top10Rail({ videos, onOpen }) {
  return (
    <aside className="w-full lg:w-72 shrink-0">
      <h2 className="text-[#F2F0EA] text-lg font-semibold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        Top 10 today
      </h2>
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl divide-y divide-neutral-900">
        {videos.map((v, i) => (
          <button key={`${v.id}-${i}`} onClick={() => onOpen(v)} className="w-full flex items-center gap-3 p-3 hover:bg-neutral-900/60 transition-colors text-left">
            <span className="w-6 text-lg font-semibold text-amber-400/80 text-center" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {i + 1}
            </span>
            <img src={v.thumb} alt="" className="w-16 h-10 object-cover rounded-md shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-neutral-100 truncate">{v.title}</p>
              <StarRating value={v.rating} />
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

// ---------- Episode row editor (used in both quick-add and edit) ----------

function EpisodeListEditor({ episodes, onChange }) {
  function updateEpisode(index, field, value) {
    const next = [...episodes];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }
  function addEpisode() {
    onChange([...episodes, { id: `${Math.random()}`, title: `Episode ${episodes.length + 1}`, duration: "" }]);
  }
  function removeEpisode(index) {
    onChange(episodes.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-neutral-400 flex items-center gap-1.5">
          <ListVideo size={13} />
          Episodes
        </p>
        <button type="button" onClick={addEpisode} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
          + Add episode
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {episodes.map((ep, i) => (
          <div key={ep.id} className="flex gap-2">
            <input
              value={ep.title}
              onChange={(e) => updateEpisode(i, "title", e.target.value)}
              placeholder={`Episode ${i + 1} title`}
              className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
            />
            <input
              value={ep.duration}
              onChange={(e) => updateEpisode(i, "duration", e.target.value)}
              placeholder="12:04"
              className="w-20 shrink-0 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
            />
            {episodes.length > 1 && (
              <button type="button" onClick={() => removeEpisode(i)} aria-label="Remove episode" className="shrink-0 text-neutral-500 hover:text-red-400 transition-colors">
                <X size={15} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Admin modals (edit / delete / quick-add) ----------

function ThumbnailPicker({ thumbnail, onChange, required }) {
  const inputRef = useRef(null);
  return (
    <div>
      <p className="text-xs text-neutral-400 mb-1.5">Thumbnail {required && <span className="text-amber-400">*</span>}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-3 border border-dashed border-neutral-800 rounded-xl p-3 hover:border-amber-500/50 transition-colors text-left"
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-20 h-12 object-cover rounded-md shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
            <ImageIcon size={17} className="text-neutral-500" />
          </div>
        )}
        <span className="text-sm text-neutral-300">{thumbnail ? "Change thumbnail" : "Upload a thumbnail image"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(URL.createObjectURL(file));
        }}
      />
    </div>
  );
}

function EditVideoModal({ video, onClose, onSaved }) {
  const [title, setTitle] = useState(video.title);
  const [channel, setChannel] = useState(video.channel);
  const [thumbnail, setThumbnail] = useState(video.thumb);
  const [isPremium, setIsPremium] = useState(Boolean(video.isPremium));
  const [episodes, setEpisodes] = useState(video.episodes);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F2F0EA] text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Edit video</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-neutral-500 hover:text-neutral-300" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <ThumbnailPicker thumbnail={thumbnail} onChange={setThumbnail} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 outline-none focus:border-amber-500/60 transition-colors" />
          <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Channel" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 outline-none focus:border-amber-500/60 transition-colors" />
          <EpisodeListEditor episodes={episodes} onChange={setEpisodes} />
          <label className="flex items-center gap-2.5 text-sm text-neutral-300 cursor-pointer select-none">
            <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="accent-amber-400 w-4 h-4" />
            <Crown size={14} className="text-amber-400" />
            Premium only
          </label>
          <div className="flex gap-2 mt-1">
            <button onClick={onClose} className="flex-1 text-sm text-neutral-300 border border-neutral-800 rounded-full py-2 hover:border-neutral-600 transition-colors">Cancel</button>
            <button onClick={() => onSaved({ ...video, title, channel, thumb: thumbnail, isPremium, episodes })} className="flex-1 text-sm bg-amber-400 text-neutral-900 font-medium rounded-full py-2 hover:bg-amber-300 transition-colors">Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ video, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-[#F2F0EA] text-lg font-semibold mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Delete this video?</h3>
        <p className="text-neutral-400 text-sm mb-5">"{video.title}" will be removed. This can't be undone.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-sm text-neutral-300 border border-neutral-800 rounded-full py-2 hover:border-neutral-600 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 text-sm bg-red-500 text-white font-medium rounded-full py-2 hover:bg-red-400 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

function QuickAddModal({ onClose, onAdded }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [episodes, setEpisodes] = useState([{ id: `${Math.random()}`, title: "Episode 1", duration: "" }]);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!thumbnail) { setError("Upload a thumbnail before adding the video."); return; }
    if (!title.trim()) { setError("Give it a title."); return; }
    onAdded({
      id: nextId++,
      title,
      channel: channel || "Your channel",
      views: "0",
      rating: 0,
      thumb: thumbnail,
      isPremium,
      episodes,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F2F0EA] text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Add video</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} className="text-neutral-500 hover:text-neutral-300" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <ThumbnailPicker thumbnail={thumbnail} onChange={setThumbnail} required />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors" />
          <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="Channel name" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors" />
          <EpisodeListEditor episodes={episodes} onChange={setEpisodes} />
          <label className="flex items-center gap-2.5 text-sm text-neutral-300 cursor-pointer select-none">
            <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="accent-amber-400 w-4 h-4" />
            <Crown size={14} className="text-amber-400" />
            Premium only
          </label>
          {error && <Banner type="error" message={error} />}
          <button type="submit" className="mt-1 flex items-center justify-center gap-2 bg-amber-400 text-neutral-900 font-medium text-sm rounded-full py-2.5 hover:bg-amber-300 transition-colors">
            <UploadCloud size={15} />
            Add video
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Restyled add tile ----------

function AddVideoTile({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center gap-2.5 aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 hover:border-amber-500/70 transition-all duration-300 hover:shadow-[0_0_24px_-6px_rgba(245,158,11,0.35)]"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.12),transparent_70%)]" />
      <div className="relative w-11 h-11 rounded-full bg-amber-400/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-400 group-hover:border-amber-400 transition-colors duration-300">
        <Plus size={22} className="text-amber-400 group-hover:text-neutral-900 transition-colors duration-300" strokeWidth={2.5} />
      </div>
      <span className="relative text-sm font-medium text-neutral-400 group-hover:text-amber-300 transition-colors duration-300">Add video</span>
    </button>
  );
}

// ---------- The card (same card for everyone; admin controls layer on top) ----------

function VideoCard({ video, role, favorited, onToggleFavorite, onRate, onEdit, onDelete, onOpen, dragHandlers, isDragging }) {
  const isAdmin = role === "ADMIN" || role === "SUB_ADMIN";
  const episodeCount = video.episodes?.length || 1;
  const primaryDuration = video.episodes?.[0]?.duration || "";

  return (
    <div {...dragHandlers} className={`group relative ${isDragging ? "opacity-40" : ""}`}>
      {isAdmin && (
        <div className="absolute -left-2 -top-2 w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity" title="Drag to reorder">
          <GripVertical size={13} />
        </div>
      )}

      <button onClick={() => onOpen(video)} className="block w-full text-left">
        <div className="relative rounded-xl overflow-hidden bg-neutral-900">
          <img src={video.thumb} alt="" className="w-full aspect-video object-cover group-hover:scale-[1.03] transition-transform duration-300" draggable={false} />
          <span className="absolute bottom-1.5 right-1.5 text-[11px] bg-black/70 text-neutral-100 px-1.5 py-0.5 rounded">
            {episodeCount > 1 ? `${episodeCount} episodes` : primaryDuration}
          </span>
          {video.isPremium && (
            <span className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[10px] bg-black/70 text-amber-400 px-1.5 py-0.5 rounded">
              <Crown size={10} />
              Premium
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <div className="w-8 h-8 rounded-full bg-neutral-800 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-neutral-100 leading-snug line-clamp-2">{video.title}</p>
              {!isAdmin && <FavoriteButton favorited={favorited} onToggle={onToggleFavorite} />}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">{video.channel} · {video.views} views</p>
            <StarRating value={video.rating} interactive={!isAdmin} onRate={onRate} />
          </div>
        </div>
      </button>

      {isAdmin && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(video); }} aria-label="Edit" className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-neutral-200 hover:text-amber-400 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(video); }} aria-label="Delete" className="w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-neutral-200 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Video grid (same grid, admin chrome conditional) ----------

function VideoGrid({ videos, role, favoriteIds, onToggleFavorite, onRate, onReorder, onEdit, onDelete, onAdd, onOpen }) {
  const isAdmin = role === "ADMIN" || role === "SUB_ADMIN";
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);
  const [banner, setBanner] = useState({ type: null, message: "" });
  const dragIndexRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);

  function handleDragStart(index) {
    if (!isAdmin) return;
    dragIndexRef.current = index;
    setDragIndex(index);
  }
  function handleDragEnter(index) {
    if (dragIndexRef.current == null || dragIndexRef.current === index) return;
    onReorder(dragIndexRef.current, index);
    dragIndexRef.current = index;
    setDragIndex(index);
  }
  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragIndex(null);
  }

  return (
    <section className="flex-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#F2F0EA] text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          {isAdmin ? "Videos" : "Recommended for you"}
        </h2>
        <span className="text-xs text-neutral-500 flex items-center gap-1">
          {isAdmin ? "Drag a card to reorder" : (<><Clock size={13} /> Based on your watch history</>)}
        </span>
      </div>

      {banner.message && <div className="mb-4"><Banner type={banner.type} message={banner.message} /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-7">
        {isAdmin && <AddVideoTile onClick={() => setAdding(true)} />}

        {videos.map((v, index) => (
          <VideoCard
            key={v.id}
            video={v}
            role={role}
            favorited={favoriteIds.has(v.id)}
            onToggleFavorite={() => onToggleFavorite(v.id)}
            onRate={(stars) => onRate(v.id, stars)}
            onEdit={setEditing}
            onDelete={setDeleting}
            onOpen={onOpen}
            isDragging={dragIndex === index}
            dragHandlers={isAdmin ? {
              draggable: true,
              onDragStart: () => handleDragStart(index),
              onDragEnter: () => handleDragEnter(index),
              onDragOver: (e) => e.preventDefault(),
              onDragEnd: handleDragEnd,
            } : {}}
          />
        ))}
      </div>

      {editing && (
        <EditVideoModal
          video={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            onEdit(updated);
            setEditing(null);
            setBanner({ type: "success", message: role === "SUB_ADMIN" ? "Edit sent for admin approval" : "Video updated" });
          }}
        />
      )}
      {deleting && (
        <DeleteConfirm
          video={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.id);
            setDeleting(null);
            setBanner({ type: "success", message: role === "SUB_ADMIN" ? "Delete sent for admin approval" : "Video deleted" });
          }}
        />
      )}
      {adding && (
        <QuickAddModal
          onClose={() => setAdding(false)}
          onAdded={(newVideo) => {
            onAdd(newVideo);
            setAdding(false);
            setBanner({ type: "success", message: "Video added" });
          }}
        />
      )}
    </section>
  );
}

// ---------- Watch page (opens when any video is clicked) ----------

function WatchView({ video, role, favorited, onToggleFavorite, onRate, onBack }) {
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const episodes = video.episodes || [];
  const activeEpisode = episodes[activeEpisodeIndex];
  const isAdmin = role === "ADMIN" || role === "SUB_ADMIN";

  return (
    <div className="min-h-screen bg-[#0E0E10] text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors mb-4">
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <img src={video.thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              <button className="relative w-16 h-16 rounded-full bg-amber-400/90 flex items-center justify-center hover:bg-amber-400 transition-colors">
                <Play size={26} className="text-neutral-900 ml-1" fill="currentColor" />
              </button>
              <span className="absolute bottom-3 right-3 text-xs bg-black/70 text-neutral-100 px-2 py-1 rounded">
                {activeEpisode?.title} {activeEpisode?.duration && `· ${activeEpisode.duration}`}
              </span>
            </div>

            <h1 className="text-[#F2F0EA] text-xl md:text-2xl font-semibold mt-4" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {video.title}
            </h1>
            {episodes.length > 1 && <p className="text-neutral-400 text-sm mt-1">Now playing: {activeEpisode?.title}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <p className="text-sm text-neutral-400">{video.channel} · {video.views} views</p>
              <div className="flex items-center gap-4">
                <StarRating value={video.rating} interactive={!isAdmin} onRate={onRate} />
                {!isAdmin && (
                  <button
                    onClick={onToggleFavorite}
                    className="flex items-center gap-1.5 text-sm text-neutral-300 border border-neutral-800 rounded-full px-3 py-1.5 hover:border-neutral-600 transition-colors"
                  >
                    <Heart size={15} className={favorited ? "fill-amber-400 text-amber-400" : ""} />
                    {favorited ? "Favorited" : "Favorite"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {episodes.length > 1 && (
            <aside className="w-full lg:w-80 shrink-0">
              <h2 className="text-[#F2F0EA] text-base font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                <ListVideo size={16} className="text-amber-400" />
                Episodes
              </h2>
              <div className="bg-neutral-950 border border-neutral-900 rounded-2xl divide-y divide-neutral-900">
                {episodes.map((ep, i) => (
                  <button
                    key={ep.id}
                    onClick={() => setActiveEpisodeIndex(i)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${i === activeEpisodeIndex ? "bg-amber-500/10" : "hover:bg-neutral-900/60"}`}
                  >
                    <span className={`w-6 text-sm font-semibold text-center ${i === activeEpisodeIndex ? "text-amber-400" : "text-neutral-500"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${i === activeEpisodeIndex ? "text-amber-300" : "text-neutral-200"}`}>{ep.title}</p>
                      <p className="text-xs text-neutral-500">{ep.duration}</p>
                    </div>
                    {i === activeEpisodeIndex && <Play size={13} className="text-amber-400 shrink-0" fill="currentColor" />}
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Footer (same for every role) ----------

function Footer() {
  const columns = [
    { title: "Reel.", links: ["About", "Careers", "Press", "Blog"] },
    { title: "Support", links: ["Help center", "Contact us", "Report a video", "Community guidelines"] },
    { title: "Legal", links: ["Terms of service", "Privacy policy", "Cookie settings", "Copyright"] },
  ];
  return (
    <footer className="border-t border-neutral-900 mt-4">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-semibold text-[#F2F0EA] tracking-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Reel<span className="text-amber-400">.</span>
            </span>
            <p className="text-neutral-500 text-sm mt-3 leading-relaxed">Watch, rate, and discover videos picked for you.</p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" aria-label="Facebook" className="text-neutral-500 hover:text-neutral-300 transition-colors"><Facebook size={17} /></a>
              <a href="#" aria-label="Twitter" className="text-neutral-500 hover:text-neutral-300 transition-colors"><Twitter size={17} /></a>
              <a href="#" aria-label="Instagram" className="text-neutral-500 hover:text-neutral-300 transition-colors"><Instagram size={17} /></a>
              <a href="#" aria-label="Youtube" className="text-neutral-500 hover:text-neutral-300 transition-colors"><Youtube size={17} /></a>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-neutral-300 text-sm font-medium mb-3">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-neutral-500 text-sm hover:text-neutral-300 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-neutral-900 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-neutral-600 text-xs">© {new Date().getFullYear()} Reel. All rights reserved.</p>
          <p className="text-neutral-600 text-xs">Made for people who like to watch things.</p>
        </div>
      </div>
    </footer>
  );
}

// ---------- Page ----------

export default function VideoPlatformLayout() {
  const [role, setRole] = useState("USER"); // preview switcher only - real app reads this from login
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [videos, setVideos] = useState(INITIAL_VIDEOS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openVideoId, setOpenVideoId] = useState(null); // in-page "route" — real app uses /watch/:id instead

  function toggleFavorite(id) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function rateVideo(id, stars) {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, rating: stars } : v)));
  }

  function reorderVideos(fromIndex, toIndex) {
    setVideos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function editVideo(updated) {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }

  function deleteVideo(id) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  function addVideo(newVideo) {
    setVideos((prev) => [newVideo, ...prev]);
  }

  const visibleVideos = videos.slice(0, visibleCount);
  const hasMore = visibleCount < videos.length;
  const openVideo = videos.find((v) => v.id === openVideoId);

  const roleSwitcher = (
    <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center gap-2 text-xs">
      <span className="text-neutral-500">Preview as:</span>
      {["USER", "SUB_ADMIN", "ADMIN"].map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`px-2.5 py-1 rounded-full transition-colors ${role === r ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400 hover:text-neutral-200"}`}
        >
          {r === "USER" ? "User" : r === "SUB_ADMIN" ? "Sub-admin" : "Admin"}
        </button>
      ))}
    </div>
  );

  if (openVideo) {
    return (
      <div className="min-h-screen bg-[#0E0E10]">
        {roleSwitcher}
        <WatchView
          video={openVideo}
          role={role}
          favorited={favoriteIds.has(openVideo.id)}
          onToggleFavorite={() => toggleFavorite(openVideo.id)}
          onRate={(stars) => rateVideo(openVideo.id, stars)}
          onBack={() => setOpenVideoId(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-neutral-100">
      {roleSwitcher}
      <Header role={role} onLogoClick={() => setOpenVideoId(null)} />
      <FeaturedCarousel videos={FEATURED_VIDEOS} onOpen={(v) => setOpenVideoId(v.id)} />
      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <Top10Rail videos={[...videos].sort((a, b) => b.rating - a.rating).slice(0, 10)} onOpen={(v) => setOpenVideoId(v.id)} />
        <div className="flex-1 flex flex-col">
          <VideoGrid
            videos={visibleVideos}
            role={role}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onRate={rateVideo}
            onReorder={reorderVideos}
            onEdit={editVideo}
            onDelete={deleteVideo}
            onAdd={addVideo}
            onOpen={(v) => setOpenVideoId(v.id)}
          />
          {hasMore && (
            <button onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, videos.length))} className="self-center mt-8 flex items-center gap-1.5 text-sm text-neutral-200 border border-neutral-800 rounded-full px-5 py-2.5 hover:border-amber-500/60 hover:text-amber-400 transition-colors">
              Next
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
