import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Crown, X, Check, AlertCircle, Activity, Film, UploadCloud } from "lucide-react";

/*
  AdminDashboard
  ---------------
  Only reachable/meaningful for a JWT with ROLE_ADMIN (the backend enforces
  this on every /api/admin/** call regardless). Two tabs:
    - Videos: list, edit (title/description/tags/premium), delete
    - Activity log: admin + user actions, newest first

  API used:
    GET    /api/videos/latest?page=&size=      (reused to list videos for management)
    PUT    /api/admin/videos/{id}              { title, description, tags, isPremium }
    DELETE /api/admin/videos/{id}
    GET    /api/admin/activity-log?page=&size=
*/

const API_BASE = "http://localhost:8080";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Banner({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
        isError ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
      }`}
    >
      {isError ? <AlertCircle size={14} /> : <Check size={14} />}
      {message}
    </div>
  );
}

// ---------- Edit modal ----------

function EditVideoModal({ video, onClose, onSaved }) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [tags, setTags] = useState(video.tags || "");
  const [isPremium, setIsPremium] = useState(Boolean(video.isPremium));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title, description, tags, isPremium }),
      });
      if (!res.ok) {
        setError("Couldn't save changes. Try again.");
        return;
      }
      const updated = await res.json();
      onSaved(updated);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-[#F2F0EA] text-lg font-semibold"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Edit video
          </h3>
          <button onClick={onClose} aria-label="Close">
            <X size={18} className="text-neutral-500 hover:text-neutral-300" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Title</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 outline-none focus:border-amber-500/60 transition-colors resize-none"
            />
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Tags</p>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma,separated,tags"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="accent-amber-400 w-4 h-4"
            />
            <Crown size={14} className="text-amber-400" />
            Premium only
          </label>

          {error && <Banner type="error" message={error} />}

          <div className="flex gap-2 mt-1">
            <button
              onClick={onClose}
              className="flex-1 text-sm text-neutral-300 border border-neutral-800 rounded-full py-2 hover:border-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-sm bg-amber-400 text-neutral-900 font-medium rounded-full py-2 hover:bg-amber-300 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Delete confirm ----------

function DeleteConfirm({ video, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <h3
          className="text-[#F2F0EA] text-lg font-semibold mb-2"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Delete this video?
        </h3>
        <p className="text-neutral-400 text-sm mb-5">
          "{video.title}" will be permanently removed. This can't be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-neutral-300 border border-neutral-800 rounded-full py-2 hover:border-neutral-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 text-sm bg-red-500 text-white font-medium rounded-full py-2 hover:bg-red-400 transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Videos tab ----------

function VideosTab() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState({ type: null, message: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/videos/latest?page=0&size=50`, { headers: authHeaders() });
      setVideos(await res.json());
    } catch {
      setBanner({ type: "error", message: "Couldn't load videos." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSaved(updated) {
    setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setEditing(null);
    setBanner({ type: "success", message: "Video updated" });
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/videos/${deleting.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setBanner({ type: "error", message: "Couldn't delete video." });
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== deleting.id));
      setBanner({ type: "success", message: "Video deleted" });
    } catch {
      setBanner({ type: "error", message: "Couldn't reach the server." });
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-neutral-500 text-sm">{videos.length} videos</p>
        <a
          href="/admin/upload"
          className="flex items-center gap-1.5 text-sm bg-amber-400 text-neutral-900 font-medium rounded-full px-4 py-2 hover:bg-amber-300 transition-colors"
        >
          <UploadCloud size={15} />
          Upload new
        </a>
      </div>

      {banner.message && <div className="mb-4"><Banner type={banner.type} message={banner.message} /></div>}

      {loading ? (
        <p className="text-neutral-500 text-sm">Loading videos...</p>
      ) : (
        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl divide-y divide-neutral-900">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-3">
              <img src={v.thumbnailUrl} alt="" className="w-20 h-12 object-cover rounded-md shrink-0 bg-neutral-900" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-neutral-100 truncate">{v.title}</p>
                  {v.isPremium && <Crown size={13} className="text-amber-400 shrink-0" />}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {v.viewCount?.toLocaleString()} views · {v.averageRating?.toFixed(1)}★
                </p>
              </div>
              <button
                onClick={() => setEditing(v)}
                aria-label="Edit"
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-colors"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setDeleting(v)}
                aria-label="Delete"
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && <EditVideoModal video={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {deleting && (
        <DeleteConfirm
          video={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          deleting={busy}
        />
      )}
    </div>
  );
}

// ---------- Activity log tab ----------

const ACTION_LABELS = {
  LOGIN: "Logged in",
  REGISTER: "Registered",
  VIDEO_UPLOAD: "Uploaded video",
  VIDEO_EDIT: "Edited video",
  VIDEO_DELETE: "Deleted video",
  FAVORITE_ADD: "Added favorite",
  FAVORITE_REMOVE: "Removed favorite",
  RATING_SET: "Rated video",
  SUBSCRIBE: "Subscribed",
  UNSUBSCRIBE: "Unsubscribed",
  PROFILE_UPDATE: "Updated profile",
  PASSWORD_CHANGE: "Changed password",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActivityLogTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/admin/activity-log?page=0&size=100`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        setEntries(await res.json());
      } catch {
        setError("Couldn't load the activity log.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-neutral-500 text-sm">Loading activity...</p>;
  if (error) return <Banner type="error" message={error} />;

  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl divide-y divide-neutral-900">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-neutral-100">
              <span className="text-neutral-300 font-medium">{e.userDisplayName}</span>{" "}
              <span className="text-neutral-500">— {ACTION_LABELS[e.action] || e.action}</span>
            </p>
            {e.description && <p className="text-xs text-neutral-500 mt-0.5 truncate">{e.description}</p>}
          </div>
          <span className="text-xs text-neutral-600 shrink-0">{timeAgo(e.createdAt)}</span>
        </div>
      ))}
      {entries.length === 0 && <p className="text-neutral-500 text-sm p-4">No activity yet.</p>}
    </div>
  );
}

// ---------- Page ----------

export default function AdminDashboard() {
  const [tab, setTab] = useState("videos"); // "videos" | "activity"

  return (
    <div className="min-h-screen bg-[#0E0E10] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-[#F2F0EA] text-2xl font-semibold mb-6"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Admin dashboard
        </h1>

        <div className="flex bg-neutral-900 border border-neutral-800 rounded-full p-1 mb-6 w-fit">
          <button
            onClick={() => setTab("videos")}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full transition-colors ${
              tab === "videos" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
            }`}
          >
            <Film size={14} />
            Videos
          </button>
          <button
            onClick={() => setTab("activity")}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full transition-colors ${
              tab === "activity" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
            }`}
          >
            <Activity size={14} />
            Activity log
          </button>
        </div>

        {tab === "videos" ? <VideosTab /> : <ActivityLogTab />}
      </div>
    </div>
  );
}
