import React from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";

import VideoPlatformLayout from "./pages/VideoPlatformLayout.jsx";
import AuthPage, { OAuthCallback } from "./pages/AuthPage.jsx";
import WatchPage from "./pages/WatchPage.jsx";
import AccountSettings from "./pages/AccountSettings.jsx";
import AdminUpload from "./pages/AdminUpload.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminAccountsManager from "./pages/AdminAccountsManager.jsx";
import ApprovalQueue from "./pages/ApprovalQueue.jsx";
import PremiumPage from "./pages/PremiumPage.jsx";

/*
  Route map
  ---------
  /                     VideoPlatformLayout   — homepage (STILL MOCK DATA — see note below)
  /login                AuthPage              — login/register + Google/Facebook buttons
  /oauth/callback       OAuthCallback         — where the backend redirects after Google/Facebook sign-in
  /watch/:id            WatchPage             — single video + episodes, reads :id from the URL
  /account              AccountSettings       — change name/password, logout
  /premium              PremiumPage           — subscribe/unsubscribe
  /admin/upload         AdminUpload           — admin video upload form
  /admin                AdminDashboard        — video management + activity log (ADMIN/SUB_ADMIN)
  /admin/accounts       AdminAccountsManager  — manage other admins (ADMIN only)
  /admin/approvals      ApprovalQueue         — review sub-admin edit/delete requests (ADMIN only)

  IMPORTANT — before this is a real deployable site:
  1. VideoPlatformLayout.jsx (the homepage) currently uses local mock data and
     has a "Preview as: User/Sub-admin/Admin" switcher left in from UI preview
     work. Swap it for the live-API version (fetching /api/videos/top10,
     /api/videos/latest, etc., and reading the real logged-in user's role
     instead of the switcher) before shipping.
  2. None of these pages currently redirect unauthenticated users away from
     protected routes (/account, /admin/*, /premium), or block non-admin
     roles from /admin/*. Add a route guard (check localStorage authToken
     and the user's role, redirect to /login or / if not allowed) before
     deploying — right now the backend enforces permissions on the API,
     but the pages themselves don't check before rendering.
  3. WatchPage expects a numeric video id in the URL; this wrapper passes it
     through via the videoId prop since WatchPage also supports reading it
     from window.location as a fallback.
*/

function WatchPageWithParams() {
  const { id } = useParams();
  return <WatchPage videoId={Number(id)} />;
}

function AuthPageWithRedirect() {
  const navigate = useNavigate();
  return <AuthPage onAuthenticated={() => navigate("/")} />;
}

function OAuthCallbackWithRedirect() {
  const navigate = useNavigate();
  return <OAuthCallback onAuthenticated={() => navigate("/")} />;
}

function AccountSettingsWithLogout() {
  const navigate = useNavigate();
  // AccountSettings expects a `user` prop (display name etc.) - wire this to
  // wherever your app keeps the logged-in user's info once that's set up.
  return <AccountSettings user={{}} onLogout={() => navigate("/login")} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<VideoPlatformLayout />} />
      <Route path="/login" element={<AuthPageWithRedirect />} />
      <Route path="/oauth/callback" element={<OAuthCallbackWithRedirect />} />
      <Route path="/watch/:id" element={<WatchPageWithParams />} />
      <Route path="/account" element={<AccountSettingsWithLogout />} />
      <Route path="/premium" element={<PremiumPage />} />
      <Route path="/admin/upload" element={<AdminUpload />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/accounts" element={<AdminAccountsManager />} />
      <Route path="/admin/approvals" element={<ApprovalQueue />} />
    </Routes>
  );
}
