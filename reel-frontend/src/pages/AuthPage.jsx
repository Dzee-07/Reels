import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";

/*
  AuthPage
  --------
  Handles both login and register in one component (tab toggle),
  plus "Continue with Google" / "Continue with Facebook" buttons that
  redirect to the Spring Boot OAuth2 endpoints. After Google/Facebook
  confirm the user, the backend's OAuth2SuccessHandler redirects to
  /oauth/callback?token=... — that's handled by OAuthCallback below,
  which this file also exports.

  API base + endpoints (see reel-backend):
    POST /api/auth/register   { email, displayName, password }
    POST /api/auth/login      { email, password }
    GET  /oauth2/authorization/google
    GET  /oauth2/authorization/facebook
*/

const API_BASE = "http://localhost:8080";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.9v-6.3H5.3V9h2.3V7.1c0-2.27 1.35-3.53 3.43-3.53.99 0 2.03.18 2.03.18v2.23h-1.14c-1.13 0-1.48.7-1.48 1.42V9h2.52l-.4 2.6h-2.12v6.3A9 9 0 0 0 18 9z" />
    </svg>
  );
}

function OAuthButtons() {
  return (
    <div className="flex flex-col gap-2.5">
      <a
        href={`${API_BASE}/oauth2/authorization/google`}
        className="flex items-center justify-center gap-2.5 border border-neutral-800 rounded-full py-2.5 text-sm text-neutral-200 hover:bg-neutral-900 transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </a>
      <a
        href={`${API_BASE}/oauth2/authorization/facebook`}
        className="flex items-center justify-center gap-2.5 border border-neutral-800 rounded-full py-2.5 text-sm text-neutral-200 hover:bg-neutral-900 transition-colors"
      >
        <FacebookIcon />
        Continue with Facebook
      </a>
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5">
      <AlertCircle size={12} />
      {message}
    </p>
  );
}

function TextField({ icon: Icon, error, ...props }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 focus-within:border-amber-500/60 transition-colors">
        <Icon size={16} className="text-neutral-500 shrink-0" />
        <input
          {...props}
          className="bg-transparent outline-none text-sm text-neutral-100 placeholder-neutral-500 w-full"
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

function PasswordField({ value, onChange, error, placeholder = "Password" }) {
  const [show, setShow] = useState(false);
  return (
    <div>
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
      <FieldError message={error} />
    </div>
  );
}

// ---------- Login ----------

function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!email.trim()) next.email = "Enter your email";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setServerError(res.status === 401 ? "Incorrect email or password" : "Something went wrong. Try again.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("authToken", data.token);
      onSuccess?.(data);
    } catch {
      setServerError("Couldn't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        icon={Mail}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      {serverError && <FieldError message={serverError} />}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 bg-amber-400 text-neutral-900 font-medium text-sm rounded-full py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}

// ---------- Register ----------

function RegisterForm({ onSuccess }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!displayName.trim()) next.displayName = "Enter a display name";
    if (!email.trim()) next.email = "Enter your email";
    if (password.length < 8) next.password = "Use at least 8 characters";
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      if (!res.ok) {
        setServerError(res.status === 409 ? "An account with that email already exists" : "Something went wrong. Try again.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("authToken", data.token);
      onSuccess?.(data);
    } catch {
      setServerError("Couldn't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        icon={User}
        placeholder="Display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        error={errors.displayName}
      />
      <TextField
        icon={Mail}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      {serverError && <FieldError message={serverError} />}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 bg-amber-400 text-neutral-900 font-medium text-sm rounded-full py-2.5 hover:bg-amber-300 transition-colors disabled:opacity-60"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

// ---------- Page ----------

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login"); // "login" | "register"

  return (
    <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span
            className="text-3xl font-semibold text-[#F2F0EA] tracking-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Reel<span className="text-amber-400">.</span>
          </span>
          <p className="text-neutral-500 text-sm mt-2">
            {mode === "login" ? "Log in to keep watching" : "Create your account"}
          </p>
        </div>

        <div className="flex bg-neutral-900 border border-neutral-800 rounded-full p-1 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 text-sm py-1.5 rounded-full transition-colors ${
              mode === "login" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 text-sm py-1.5 rounded-full transition-colors ${
              mode === "register" ? "bg-amber-400 text-neutral-900 font-medium" : "text-neutral-400"
            }`}
          >
            Sign up
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm onSuccess={onAuthenticated} />
        ) : (
          <RegisterForm onSuccess={onAuthenticated} />
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-neutral-800 flex-1" />
          <span className="text-xs text-neutral-500">or</span>
          <div className="h-px bg-neutral-800 flex-1" />
        </div>

        <OAuthButtons />
      </div>
    </div>
  );
}

// ---------- OAuth redirect target ----------
// Route /oauth/callback to this component. The backend's OAuth2SuccessHandler
// redirects here with ?token=... after Google/Facebook sign-in succeeds.

export function OAuthCallback({ onAuthenticated }) {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("authToken", token);
      onAuthenticated?.({ token });
    }
  }, [onAuthenticated]);

  return (
    <div className="min-h-screen bg-[#0E0E10] flex items-center justify-center">
      <p className="text-neutral-400 text-sm">Signing you in...</p>
    </div>
  );
}
