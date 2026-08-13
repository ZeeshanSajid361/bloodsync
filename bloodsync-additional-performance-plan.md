# BloodSync 2.0 — Additional Performance Implementation Plan

**Context for the agent:** The app already has: client localStorage SWR caching, server in-memory TTL cache (`globalThis._apiCache`), background pre-warm pinging, `.lean()` queries, non-blocking token updates, and Vite code-splitting. This plan covers what's still missing for real production-grade performance — mainly closing the gap between "fast when warm on one instance" and "fast under real concurrent traffic." Work in order; commit each phase separately. Do not change existing working features.

---

## Phase 1 — Replace/augment in-memory cache with a real shared cache (Redis)

**Why:** `globalThis._apiCache` only persists within a single warm serverless instance. Under concurrent traffic, different users can land on different Vercel instances, each with an empty cache — so the "sub-5ms" cache hit rate the doc reports is best-case, not typical-case under load.

- Add **Upstash Redis** (REST-based — free tier, works correctly across all serverless instances since it's an external service, not in-process memory) OR use **Vercel KV** (Vercel's own Redis-compatible free-tier storage, if staying fully inside the Vercel ecosystem is preferred).
- Replace the existing `server/src/utils/cache.js` in-memory implementation with Redis calls, keeping the same TTL values already chosen (15s for `/api/donors/me`, `/api/hospitals/me`; 30s for `/api/hospitals/directory`).
- Keep the same invalidation-on-mutation logic (`PUT`/`PATCH` clears the relevant key) — just point it at Redis instead of `globalThis`.
- Do not remove the client-side localStorage SWR cache — that's a separate, valid layer (instant perceived render) and should stay.

**Acceptance check:** Cache hit rate should stay consistent even when simulating concurrent requests from different "cold" invocations (can be tested by forcing multiple parallel requests).

---

## Phase 2 — Database indexing for matching/query-heavy routes

**Why:** The doc doesn't mention indexes. Compatibility matching (`server/src/utils/compatibility.js`), donor eligibility lookups, and hospital directory listing all filter/sort on fields like city, blood group, and availability — without indexes, MongoDB does a full collection scan as data grows, which won't show up as a problem yet with a small dataset but will get progressively slower.

- Add compound indexes in the relevant Mongoose schemas:
  - `DonorProfile`: index on `{ city: 1, bloodGroup: 1, isAvailable: 1 }` (used by Code Red matching)
  - `Organization`/hospital inventory: index on `{ city: 1 }` and on whatever field the directory listing sorts/filters by
  - `User`: confirm `email` has a unique index (should already exist via schema, but verify)
- Use `.explain("executionStats")` on the key queries in `donors/index.js` and `seekers/index.js` to confirm indexes are actually being used, not just declared.

**Acceptance check:** Report query execution stats before/after — `totalDocsExamined` should drop close to `nReturned`.

---

## Phase 3 — Trim API response payloads

**Why:** `.lean()` helps, but if routes are still returning full Mongoose documents' worth of fields when the frontend only needs a subset, that's wasted bandwidth/serialization time on every request.

- Add `.select()` to key `.lean()` queries to return only fields actually used by the frontend for that view (e.g., hospital directory listing doesn't need every field the full hospital profile has).
- Add pagination (`limit`/`skip` or cursor-based) to any list endpoint that could grow unbounded — hospital directory, donor search results — so payload size doesn't grow with the dataset.

**Acceptance check:** Compare response payload size (KB) before/after on the directory/list endpoints.

---

## Phase 4 — Response compression

**Why:** Not mentioned in the doc. Express doesn't compress responses by default.

- Add the `compression` middleware to the Express app (`server/api/index.js` or wherever middleware is registered) — gzip/brotli-compresses JSON responses, meaningful for larger payloads like hospital directory or donor lists.

**Acceptance check:** Check response headers for `content-encoding: gzip` and compare payload size.

---

## Phase 5 — Auth token storage (security, not raw speed, but worth doing here)

**Why:** Tokens currently appear to be handled client-side via Axios interceptors (implying `localStorage`). For an app handling donor/medical data, httpOnly cookies are the safer pattern and don't meaningfully hurt performance.

- Move the JWT access/refresh token storage from `localStorage` to httpOnly, secure cookies set by the Express backend on login/refresh.
- Update the Axios client to send credentials (`withCredentials: true`) instead of manually attaching a Bearer header from localStorage.
- Keep the existing 15-min access / 7-day refresh token expiry logic — only the storage location changes.

**Acceptance check:** Confirm tokens are no longer visible in browser DevTools → Application → Local Storage, and that auth still works end to end.

---

## Phase 6 — Frontend: real cache library + prefetching (optional upgrade)

**Why:** The hand-rolled `useDonorProfile`/`useHospitalData` SWR hooks work, but a library like **TanStack Query (React Query)** handles cache deduplication, background refetch, retry logic, and stale-time config more robustly than hand-rolled localStorage hooks — and it's free/open-source.

- Optional: migrate the custom SWR hooks to TanStack Query, keeping the same "instant render from cache, refresh in background" behavior but with built-in dedup (so two components requesting the same data don't fire duplicate network calls).
- Add route-based prefetching: right after login, based on the user's role, prefetch (via dynamic `import()`) the dashboard chunk they're about to land on, rather than waiting for navigation to trigger the lazy load.

**Acceptance check:** Confirm no duplicate network requests fire for the same data across mounted components (visible in Network tab).

---

## Phase 7 — Image/static asset optimization

**Why:** Cloudinary is already used for storage, but the doc doesn't mention using Cloudinary's on-the-fly transformation/optimization features.

- Use Cloudinary URL transformation parameters (`f_auto,q_auto,w_<size>`) when displaying images/documents in the UI, so images are served in the right format/size/compression for the viewport instead of full-resolution originals.

**Acceptance check:** Compare image payload size before/after on a typical dashboard view with document/image previews.

---

## Reporting format

Same as prior phases — after each phase report: what changed, why, any risk/assumption, and confirmation no existing feature broke.
