import React, { useState, useEffect } from "react";
import { Crown, Check, X, AlertCircle } from "lucide-react";

/*
  PremiumPage
  ------------
  Plan/paywall UI only — no real payment processor wired in yet. Subscribing
  just flips the user's plan to PREMIUM server-side (see SubscriptionController
  in reel-backend). Swap handleSubscribe's request for a real checkout
  redirect (e.g. Stripe Checkout session) when you're ready; everything else
  — the premium badge on videos, the paywall on watch — already reads off
  the same `plan` field this sets.

  API used:
    GET  /api/me/subscription
    POST /api/me/subscription/subscribe
    POST /api/me/subscription/unsubscribe
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

const FREE_FEATURES = ["Watch all free videos", "Rate videos", "Save favorites", "Search & recommendations"];
const PREMIUM_FEATURES = ["Everything in Free", "Access to Premium-only videos", "Early access to new uploads", "Ad-free viewing"];

function PlanCard({ title, price, features, highlighted, action }) {
  return (
    <div
      className={`rounded-2xl p-6 border ${
        highlighted ? "border-amber-500/60 bg-amber-500/[0.04]" : "border-neutral-800 bg-neutral-950"
      }`}
    >
      <div className="flex items-center gap-2">
        {highlighted && <Crown size={16} className="text-amber-400" />}
        <h3
          className="text-[#F2F0EA] text-lg font-semibold"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {title}
        </h3>
      </div>
      <p className="text-2xl font-semibold text-[#F2F0EA] mt-3">{price}</p>
      <ul className="flex flex-col gap-2.5 mt-5 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-neutral-300">
            <Check size={14} className={highlighted ? "text-amber-400" : "text-neutral-500"} />
            {f}
          </li>
        ))}
      </ul>
      {action}
    </div>
  );
}

export default function PremiumPage() {
  const [plan, setPlan] = useState(null); // "FREE" | "PREMIUM"
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState({ type: null, message: "" });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/me/subscription`, { headers: authHeaders() });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        setPlan(data.plan);
      } catch {
        setBanner({ type: "error", message: "Couldn't load your subscription status." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubscribe() {
    setBusy(true);
    setBanner({ type: null, message: "" });
    try {
      // TODO: replace with a real checkout flow (e.g. redirect to Stripe Checkout)
      // before charging real users — this endpoint currently just flips the plan.
      const res = await fetch(`${API_BASE}/api/me/subscription/subscribe`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlan(data.plan);
      setBanner({ type: "success", message: "You're now on Premium" });
    } catch {
      setBanner({ type: "error", message: "Couldn't complete that. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setBusy(true);
    setBanner({ type: null, message: "" });
    try {
      const res = await fetch(`${API_BASE}/api/me/subscription/unsubscribe`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPlan(data.plan);
      setBanner({ type: "success", message: "Premium cancelled" });
    } catch {
      setBanner({ type: "error", message: "Couldn't complete that. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center">
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    );
  }

  const isPremium = plan === "PREMIUM";

  return (
    <div className="min-h-screen bg-[#0E0E10] px-4 py-10">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <p className="text-amber-400 text-xs font-medium tracking-wide mb-2">Reel Premium</p>
        <h1
          className="text-[#F2F0EA] text-3xl font-semibold"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Unlock everything
        </h1>
        <p className="text-neutral-500 text-sm mt-2">
          {isPremium ? "You're currently on the Premium plan." : "Upgrade for premium-only videos and an ad-free experience."}
        </p>
      </div>

      {banner.message && (
        <div className="max-w-2xl mx-auto mb-6">
          <Banner type={banner.type} message={banner.message} />
        </div>
      )}

      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
        <PlanCard
          title="Free"
          price="$0"
          features={FREE_FEATURES}
          highlighted={false}
          action={
            !isPremium ? (
              <div className="text-center text-sm text-neutral-500 py-2">Your current plan</div>
            ) : (
              <button
                onClick={handleUnsubscribe}
                disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-neutral-300 border border-neutral-800 rounded-full py-2.5 hover:border-neutral-600 transition-colors disabled:opacity-60"
              >
                <X size={14} />
                {busy ? "Cancelling..." : "Cancel Premium"}
              </button>
            )
          }
        />
        <PlanCard
          title="Premium"
          price="$9.99/mo"
          features={PREMIUM_FEATURES}
          highlighted
          action={
            isPremium ? (
              <div className="text-center text-sm text-amber-400 py-2 flex items-center justify-center gap-1.5">
                <Crown size={14} />
                Active
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 text-sm bg-amber-400 text-neutral-900 font-medium rounded-full py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
              >
                <Crown size={14} />
                {busy ? "Subscribing..." : "Subscribe"}
              </button>
            )
          }
        />
      </div>
    </div>
  );
}
