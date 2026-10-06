import React, { useState } from "react";
import { User, Lock, LogOut, Check, AlertCircle, Eye, EyeOff } from "lucide-react";

/*
  AccountSettings
  ----------------
  Lets a logged-in user change their display name or password, and log out.
  Assumes a JWT is stored in localStorage under "authToken" (set by
  AuthPage.jsx during login/register/OAuth).

  API endpoints used (see reel-backend AuthController):
    PUT /api/auth/profile   { displayName }          -> returns a fresh AuthResponse (new JWT w/ updated claims)
    PUT /api/auth/password  { currentPassword, newPassword }

  Note: users who signed in via Google/Facebook have no local password —
  the backend returns 400 for /api/auth/password in that case, and this
  component shows that message instead of a generic error.
*/

const API_BASE = "http://localhost:8080";

function authHeaders() {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function Banner({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div
      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 mt-3 ${
        isError ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
      }`}
    >
      {isError ? <AlertCircle size={14} /> : <Check size={14} />}
      {message}
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-5">
      <h2
        className="text-[#F2F0EA] text-base font-semibold"
        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
      >
        {title}
      </h2>
      {description && <p className="text-neutral-500 text-xs mt-1 mb-4">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

// ---------- Display name ----------

function DisplayNameForm({ currentName, onUpdated }) {
  const [displayName, setDisplayName] = useState(currentName || "");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim()) {
      setStatus({ type: "error", message: "Display name can't be empty" });
      return;
    }
    setLoading(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) {
        setStatus({ type: "error", message: "Couldn't update your name. Try again." });
        return;
      }
      const data = await res.json();
      localStorage.setItem("authToken", data.token);
      setStatus({ type: "success", message: "Display name updated" });
      onUpdated?.(data);
    } catch {
      setStatus({ type: "error", message: "Couldn't reach the server. Check your connection." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus-within:border-amber-500/60 transition-colors">
        <User size={16} className="text-neutral-500 shrink-0" />
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name"
          className="bg-transparent outline-none text-sm text-neutral-100 placeholder-neutral-500 w-full"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="self-start bg-amber-400 text-neutral-900 font-medium text-sm rounded-full px-5 py-2 hover:bg-amber-300 transition-colors disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save name"}
      </button>
      <Banner type={status.type} message={status.message} />
    </form>
  );
}

// ---------- Password ----------

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus-within:border-amber-500/60 transition-colors">
      <Lock size={16} className="text-neutral-500 shrink-0" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-transparent outline-none text-sm text-neutral-100 placeholder-neutral-500 w-full"
      />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={16} className="text-neutral-500" /> : <Eye size={16} className="text-neutral-500" />}
      </button>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setStatus({ type: "error", message: "New password must be at least 8 characters" });
      return;
    }
    setLoading(true);
    setStatus({ type: null, message: "" });
    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.status === 401) {
        setStatus({ type: "error", message: "Current password is incorrect" });
        return;
      }
      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        setStatus({
          type: "error",
          message: body?.message || "This account signed in with Google/Facebook and has no password to change",
        });
        return;
      }
      if (!res.ok) {
        setStatus({ type: "error", message: "Couldn't update your password. Try again." });
        return;
      }
      setStatus({ type: "success", message: "Password updated" });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setStatus({ type: "error", message: "Couldn't reach the server. Check your connection." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <PasswordInput
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
      />
      <PasswordInput
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
      />
      <button
        type="submit"
        disabled={loading}
        className="self-start bg-amber-400 text-neutral-900 font-medium text-sm rounded-full px-5 py-2 hover:bg-amber-300 transition-colors disabled:opacity-60"
      >
        {loading ? "Updating..." : "Update password"}
      </button>
      <Banner type={status.type} message={status.message} />
    </form>
  );
}

// ---------- Page ----------

export default function AccountSettings({ user, onLogout }) {
  function handleLogout() {
    localStorage.removeItem("authToken");
    onLogout?.();
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] px-4 py-8">
      <div className="max-w-xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1
            className="text-[#F2F0EA] text-2xl font-semibold"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Account settings
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>

        <SectionCard title="Display name" description="This is the name other parts of the app show for you.">
          <DisplayNameForm currentName={user?.displayName} />
        </SectionCard>

        <SectionCard title="Password" description="Update the password you use to log in.">
          <ChangePasswordForm />
        </SectionCard>
      </div>
    </div>
  );
}
