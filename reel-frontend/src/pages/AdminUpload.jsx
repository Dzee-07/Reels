import React, { useState, useRef } from "react";
import { UploadCloud, Film, Image as ImageIcon, Check, AlertCircle } from "lucide-react";

/*
  AdminUpload
  -----------
  Upload form for the admin-only endpoint POST /api/admin/videos
  (multipart: video, thumbnail, metadata). Only reachable/useful for a
  user whose JWT carries ROLE_ADMIN — gate the route itself in your
  app shell (e.g. redirect non-admins away) since the backend also
  enforces this server-side.
*/

const API_BASE = "http://localhost:8080";

function authHeader() {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function FilePicker({ label, icon: Icon, accept, file, onChange, previewKind }) {
  const inputRef = useRef(null);
  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div>
      <p className="text-xs text-neutral-400 mb-1.5">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border border-dashed border-neutral-800 rounded-xl p-4 flex items-center gap-3 hover:border-amber-500/50 transition-colors text-left"
      >
        {previewKind === "image" && previewUrl ? (
          <img src={previewUrl} alt="" className="w-16 h-10 object-cover rounded-md shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-neutral-500" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm text-neutral-200 truncate">{file ? file.name : `Choose ${label.toLowerCase()}`}</p>
          {file && <p className="text-xs text-neutral-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
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

export default function AdminUpload() {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: null, message: "" });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function validate() {
    const next = {};
    if (!videoFile) next.videoFile = "Select a video file";
    if (!thumbnailFile) next.thumbnailFile = "Select a thumbnail image";
    if (!title.trim()) next.title = "Enter a title";
    if (!durationSeconds || Number(durationSeconds) <= 0) next.durationSeconds = "Enter the duration in seconds";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setStatus({ type: null, message: "" });
    if (!validate()) return;

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("thumbnail", thumbnailFile);
    formData.append(
      "metadata",
      new Blob(
        [JSON.stringify({ title, description, tags, durationSeconds: Number(durationSeconds) })],
        { type: "application/json" }
      )
    );

    setUploading(true);
    setProgress(0);

    // XMLHttpRequest instead of fetch so we get upload progress for large video files
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/admin/videos`);
    const headers = authHeader();
    if (headers.Authorization) xhr.setRequestHeader("Authorization", headers.Authorization);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus({ type: "success", message: "Video uploaded" });
        setVideoFile(null);
        setThumbnailFile(null);
        setTitle("");
        setDescription("");
        setTags("");
        setDurationSeconds("");
        setProgress(0);
      } else if (xhr.status === 403) {
        setStatus({ type: "error", message: "Your account doesn't have admin access" });
      } else {
        setStatus({ type: "error", message: "Upload failed. Try again." });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setStatus({ type: "error", message: "Couldn't reach the server. Check your connection." });
    };

    xhr.send(formData);
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <h1
          className="text-[#F2F0EA] text-2xl font-semibold mb-1"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Upload a video
        </h1>
        <p className="text-neutral-500 text-sm mb-6">Admin only — this goes live immediately after upload.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FilePicker
            label="Video file"
            icon={Film}
            accept="video/*"
            file={videoFile}
            onChange={setVideoFile}
          />
          {errors.videoFile && <Banner type="error" message={errors.videoFile} />}

          <FilePicker
            label="Thumbnail image"
            icon={ImageIcon}
            accept="image/*"
            file={thumbnailFile}
            onChange={setThumbnailFile}
            previewKind="image"
          />
          {errors.thumbnailFile && <Banner type="error" message={errors.thumbnailFile} />}

          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Title</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
            />
            {errors.title && <Banner type="error" message={errors.title} />}
          </div>

          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this video about?"
              rows={3}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors resize-none"
            />
          </div>

          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Tags</p>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma,separated,tags — drives search and recommendations"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
            />
          </div>

          <div>
            <p className="text-xs text-neutral-400 mb-1.5">Duration (seconds)</p>
            <input
              type="number"
              min="1"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              placeholder="e.g. 754"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
            />
            {errors.durationSeconds && <Banner type="error" message={errors.durationSeconds} />}
          </div>

          {uploading && (
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <Banner type={status.type} message={status.message} />

          <button
            type="submit"
            disabled={uploading}
            className="flex items-center justify-center gap-2 bg-amber-400 text-neutral-900 font-medium text-sm rounded-full py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
          >
            <UploadCloud size={16} />
            {uploading ? `Uploading... ${progress}%` : "Upload video"}
          </button>
        </form>
      </div>
    </div>
  );
}
