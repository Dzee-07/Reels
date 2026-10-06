# Reel — deployment guide

Two projects: `reel-backend` (Spring Boot API) and `reel-frontend` (React + Vite).

## Before you deploy — known gaps

1. **Homepage still uses mock data.** `reel-frontend/src/pages/VideoPlatformLayout.jsx`
   has a "Preview as: User / Sub-admin / Admin" switcher and local sample
   videos, left over from previewing the interface without a running
   backend. It needs to be reconnected to the real API
   (`/api/videos/top10`, `/api/videos/latest`, `/api/videos/recommended`,
   favorites, ratings) and to read the logged-in user's actual role
   instead of the switcher, before this is live for real users.
2. **No route guards yet.** `/account`, `/premium`, and every `/admin/*`
   page render for anyone who navigates to them — the backend rejects
   unauthorized API calls, but the pages themselves don't redirect
   logged-out visitors or non-admins away first. Add a check (is there a
   token in `localStorage`? does the decoded role allow this page?) before
   going live.
3. **`API_BASE` is hardcoded** to `http://localhost:8080` in every page
   file. Before deploying, replace it with your real API domain (an
   environment variable via Vite's `import.meta.env` is the usual way —
   e.g. `const API_BASE = import.meta.env.VITE_API_BASE`).
4. **OAuth redirect URL is hardcoded** in the backend's
   `OAuth2SuccessHandler` to `http://localhost:3000/oauth/callback` —
   update it to your real frontend domain.
5. **Admin seed password** (`admin@reel.local` / `Password07!`) is a
   temporary bootstrap account — log in once and change it (or set
   `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` env vars before first run)
   before this touches production data.

None of these block you from running it locally or on a staging server to
keep building — they're what's left before real users hit it.

## Backend — reel-backend

Requirements: Java 17+, Maven, PostgreSQL.

1. Create a Postgres database and update `src/main/resources/application.yml`
   with its URL/username/password (or set the equivalent env vars).
2. Fill in real Google/Facebook OAuth client IDs/secrets in the same file
   if you want social login working.
3. Build and run:
   ```
   mvn clean package
   java -jar target/reel-backend-0.1.0.jar
   ```
   Or for local development: `mvn spring-boot:run`.
4. The API listens on port 8080 by default.
5. For a real deployment: put it behind a reverse proxy (nginx/Caddy) with
   HTTPS, and move the uploaded video/thumbnail storage
   (`app.storage.video-dir` / `thumbnail-dir`) to something durable like
   S3 rather than local disk — local disk won't survive a redeploy on most
   hosting platforms.

## Frontend — reel-frontend

Requirements: Node.js 18+.

1. `cd reel-frontend && npm install`
2. Local development: `npm run dev` — runs at `http://localhost:3000`.
3. Production build: `npm run build` — outputs static files to `dist/`.
4. Serve `dist/` with any static host (nginx, Vercel, Netlify, Cloudflare
   Pages, etc.) — it's a plain static single-page app once built.
5. Make sure your host rewrites all paths to `index.html` (SPA fallback),
   since this uses client-side routing — otherwise refreshing on
   `/watch/5` or any non-root page will 404.

## Suggested order to close the gaps above

1. Reconnect `VideoPlatformLayout.jsx` to the live API (gap 1).
2. Add a small `useAuth()` hook or similar that reads the JWT + role from
   `localStorage`, and wrap the protected routes in `App.jsx` with a guard
   component that redirects if the check fails (gap 2).
3. Switch every `API_BASE` constant to an env var (gap 3).
4. Update the OAuth redirect and admin seed values for your real domain
   (gaps 4-5).
