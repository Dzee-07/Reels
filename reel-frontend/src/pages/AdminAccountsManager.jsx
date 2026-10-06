import React, { useState, useEffect } from "react";
import { UserPlus, Pencil, Trash2, KeyRound, RefreshCcw, Crown, Shield, X, Check, AlertCircle } from "lucide-react";

/*
  AdminAccountsManager
  ----------------------
  ADMIN-only screen (the backend 403s a SUB_ADMIN token on every one of
  these calls, per SecurityConfig). Create/edit/delete other admin and
  sub-admin accounts, set their password directly, or flag their account
  to require a password change at next login.

  API used:
    GET    /api/admin/admins
    POST   /api/admin/admins                          { email, displayName, temporaryPassword, role }
    PUT    /api/admin/admins/{id}                      { displayName, role }
    DELETE /api/admin/admins/{id}
    PUT    /api/admin/admins/{id}/password             { newPassword }
    POST   /api/admin/admins/{id}/request-password-change
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

function RoleBadge({ role }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
        isAdmin ? "bg-amber-500/10 text-amber-400" : "bg-neutral-800 text-neutral-400"
      }`}
    >
      {isAdmin ? <Crown size={10} /> : <Shield size={10} />}
      {isAdmin ? "Admin" : "Sub-admin"}
    </span>
  );
}

// ---------- Create modal ----------

function CreateAdminModal({ onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [role, setRole] = useState("SUB_ADMIN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !displayName.trim() || temporaryPassword.length < 8) {
      setError("Fill in all fields — temporary password needs at least 8 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email, displayName, temporaryPassword, role }),
      });
      if (!res.ok) {
        setError(res.status === 409 ? "An account with that email already exists" : "Couldn't create the account.");
        return;
      }
      onCreated(await res.json());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F2F0EA] text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Add admin
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} className="text-neutral-500 hover:text-neutral-300" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
          />
          <input
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            placeholder="Temporary password"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
          />
          <p className="text-xs text-neutral-500 -mt-1">They'll be required to change this on first login.</p>

          <div className="flex bg-neutral-900 border border-neutral-800 rounded-full p-1">
            <button
              type="button"
              onClick={() => setRole("SUB_ADMIN")}
              className={`flex-1 text-sm py-1.5 rounded-full transition-colors ${
                role === "SUB_ADMIN" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
              }`}
            >
              Sub-admin
            </button>
            <button
              type="button"
              onClick={() => setRole("ADMIN")}
              className={`flex-1 text-sm py-1.5 rounded-full transition-colors ${
                role === "ADMIN" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
              }`}
            >
              Admin
            </button>
          </div>

          {error && <Banner type="error" message={error} />}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 bg-amber-400 text-neutral-900 font-medium text-sm rounded-full py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Edit modal ----------

function EditAdminModal({ admin, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(admin.displayName);
  const [role, setRole] = useState(admin.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${admin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ displayName, role }),
      });
      if (!res.ok) {
        setError("Couldn't save changes.");
        return;
      }
      onSaved(await res.json());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F2F0EA] text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Edit admin
          </h3>
          <button onClick={onClose} aria-label="Close">
            <X size={18} className="text-neutral-500 hover:text-neutral-300" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500">{admin.email}</p>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 outline-none focus:border-amber-500/60 transition-colors"
          />
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-full p-1">
            <button
              type="button"
              onClick={() => setRole("SUB_ADMIN")}
              className={`flex-1 text-sm py-1.5 rounded-full transition-colors ${
                role === "SUB_ADMIN" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
              }`}
            >
              Sub-admin
            </button>
            <button
              type="button"
              onClick={() => setRole("ADMIN")}
              className={`flex-1 text-sm py-1.5 rounded-full transition-colors ${
                role === "ADMIN" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
              }`}
            >
              Admin
            </button>
          </div>
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
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Set password modal ----------

function SetPasswordModal({ admin, onClose, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${admin.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        setError("Couldn't set the password.");
        return;
      }
      onDone();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#F2F0EA] text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Set password
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} className="text-neutral-500 hover:text-neutral-300" />
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-3">For {admin.email}</p>
        <input
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500/60 transition-colors"
        />
        {error && <div className="mt-3"><Banner type="error" message={error} /></div>}
        <button
          type="submit"
          disabled={saving}
          className="w-full mt-3 bg-amber-400 text-neutral-900 font-medium text-sm rounded-full py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : "Set password"}
        </button>
      </form>
    </div>
  );
}

// ---------- Page ----------

export default function AdminAccountsManager() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [settingPassword, setSettingPassword] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [banner, setBanner] = useState({ type: null, message: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins`, { headers: authHeaders() });
      setAdmins(await res.json());
    } catch {
      setBanner({ type: "error", message: "Couldn't load admin accounts." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleCreated(admin) {
    setAdmins((prev) => [...prev, admin]);
    setCreating(false);
    setBanner({ type: "success", message: `${admin.displayName} added as ${admin.role === "ADMIN" ? "an admin" : "a sub-admin"}` });
  }

  function handleSaved(updated) {
    setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setEditing(null);
    setBanner({ type: "success", message: "Account updated" });
  }

  async function handleDelete() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${deleting.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setBanner({ type: "error", message: "Couldn't delete that account." });
        return;
      }
      setAdmins((prev) => prev.filter((a) => a.id !== deleting.id));
      setBanner({ type: "success", message: "Account deleted" });
    } catch {
      setBanner({ type: "error", message: "Couldn't reach the server." });
    } finally {
      setDeleting(null);
    }
  }

  async function handleRequestPasswordChange(admin) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/admins/${admin.id}/request-password-change`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setBanner({ type: "error", message: "Couldn't send the request." });
        return;
      }
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, mustChangePassword: true } : a)));
      setBanner({ type: "success", message: `${admin.displayName} will be asked to change their password at next login` });
    } catch {
      setBanner({ type: "error", message: "Couldn't reach the server." });
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[#F2F0EA] text-2xl font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Admin accounts
          </h1>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-sm bg-amber-400 text-neutral-900 font-medium rounded-full px-4 py-2 hover:bg-amber-300 transition-colors"
          >
            <UserPlus size={15} />
            Add admin
          </button>
        </div>

        {banner.message && <div className="mb-4"><Banner type={banner.type} message={banner.message} /></div>}

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading accounts...</p>
        ) : (
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl divide-y divide-neutral-900">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-[#3D7A70] flex items-center justify-center text-xs font-medium text-white shrink-0">
                  {a.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-neutral-100 truncate">{a.displayName}</p>
                    <RoleBadge role={a.role} />
                    {a.mustChangePassword && (
                      <span className="text-[11px] text-amber-400/80">Password change pending</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">{a.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(a)}
                    aria-label="Edit"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setSettingPassword(a)}
                    aria-label="Set password"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-colors"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    onClick={() => handleRequestPasswordChange(a)}
                    aria-label="Request password change"
                    title="Ask them to change their password at next login"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-colors"
                  >
                    <RefreshCcw size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(a)}
                    aria-label="Delete"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {admins.length === 0 && <p className="text-neutral-500 text-sm p-4">No other admin accounts yet.</p>}
          </div>
        )}
      </div>

      {creating && <CreateAdminModal onClose={() => setCreating(false)} onCreated={handleCreated} />}
      {editing && <EditAdminModal admin={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {settingPassword && (
        <SetPasswordModal
          admin={settingPassword}
          onClose={() => setSettingPassword(null)}
          onDone={() => {
            setSettingPassword(null);
            setBanner({ type: "success", message: "Password updated" });
          }}
        />
      )}
      {deleting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-[#F2F0EA] text-lg font-semibold mb-2" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Delete this account?
            </h3>
            <p className="text-neutral-400 text-sm mb-5">
              {deleting.displayName} ({deleting.email}) will lose access immediately.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 text-sm text-neutral-300 border border-neutral-800 rounded-full py-2 hover:border-neutral-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 text-sm bg-red-500 text-white font-medium rounded-full py-2 hover:bg-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
