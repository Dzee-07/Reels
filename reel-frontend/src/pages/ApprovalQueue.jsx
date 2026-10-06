import React, { useState, useEffect } from "react";
import { Pencil, Trash2, Check, X, AlertCircle, Clock } from "lucide-react";

/*
  ApprovalQueue
  --------------
  ADMIN-only (SecurityConfig 403s a SUB_ADMIN here). Shows every pending
  edit/delete a sub-admin has submitted, with the changed fields visible
  for edits, and one-click approve/reject.

  API used:
    GET  /api/admin/approvals
    POST /api/admin/approvals/{id}/approve
    POST /api/admin/approvals/{id}/reject
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

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EditPayloadPreview({ payload }) {
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  const fields = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (fields.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {fields.map(([key, value]) => (
        <span key={key} className="text-[11px] bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded-full">
          {key}: <span className="text-neutral-200">{String(value)}</span>
        </span>
      ))}
    </div>
  );
}

function ApprovalRow({ approval, onApprove, onReject }) {
  const [busy, setBusy] = useState(false);
  const isEdit = approval.actionType === "EDIT_VIDEO";

  async function handle(action) {
    setBusy(true);
    await action(approval.id);
    setBusy(false);
  }

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isEdit ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {isEdit ? <Pencil size={14} /> : <Trash2 size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-neutral-100">
            <span className="text-neutral-300 font-medium">{approval.requestedByName}</span>{" "}
            <span className="text-neutral-500">wants to {isEdit ? "edit" : "delete"}</span>{" "}
            <span className="text-neutral-200">"{approval.videoTitle}"</span>
          </p>
          {isEdit && approval.payload && <EditPayloadPreview payload={approval.payload} />}
          <span className="text-xs text-neutral-600 flex items-center gap-1 mt-1.5">
            <Clock size={11} />
            {timeAgo(approval.createdAt)}
          </span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => handle(onReject)}
            disabled={busy}
            className="flex items-center gap-1 text-xs text-neutral-300 border border-neutral-800 rounded-full px-3 py-1.5 hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-60"
          >
            <X size={12} />
            Reject
          </button>
          <button
            onClick={() => handle(onApprove)}
            disabled={busy}
            className="flex items-center gap-1 text-xs bg-amber-400 text-neutral-900 font-medium rounded-full px-3 py-1.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
          >
            <Check size={12} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: null, message: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/approvals`, { headers: authHeaders() });
      setApprovals(await res.json());
    } catch {
      setBanner({ type: "error", message: "Couldn't load pending approvals." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/approvals/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setBanner({ type: "error", message: "Couldn't approve that request." });
        return;
      }
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setBanner({ type: "success", message: "Approved and applied" });
    } catch {
      setBanner({ type: "error", message: "Couldn't reach the server." });
    }
  }

  async function handleReject(id) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/approvals/${id}/reject`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setBanner({ type: "error", message: "Couldn't reject that request." });
        return;
      }
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setBanner({ type: "success", message: "Request rejected" });
    } catch {
      setBanner({ type: "error", message: "Couldn't reach the server." });
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[#F2F0EA] text-2xl font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Approval queue
          </h1>
          {approvals.length > 0 && (
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">
              {approvals.length} pending
            </span>
          )}
        </div>

        {banner.message && <div className="mb-4"><Banner type={banner.type} message={banner.message} /></div>}

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading...</p>
        ) : approvals.length === 0 ? (
          <p className="text-neutral-500 text-sm">Nothing waiting on approval right now.</p>
        ) : (
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl divide-y divide-neutral-900">
            {approvals.map((a) => (
              <ApprovalRow key={a.id} approval={a} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
