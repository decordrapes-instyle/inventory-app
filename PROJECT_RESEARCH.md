# PROJECT RESEARCH — Decor Drapes Instyle Ecosystem

**Scope:** Three related repositories on `E:\` that share one Firebase Realtime Database / Auth project and serve Decor Drapes Instyle (branded “RJS Instyle” / “Legend Quotation” / “Inventory Drapes”).

| Folder | Role |
|--------|------|
| `E:\Decor Drapes Instyle - Public App` | Customer-facing mobile/web profile portal (Capacitor APK) |
| `E:\Inventory-Emplyee` | Employee/admin inventory mobile/web app (Capacitor) |
| `E:\Legend_Quotation` | Admin quotation, invoicing, inventory, production, and website CMS (web + Node backends) |

**Method:** Directory inspection and source/config reading. Generated artifacts (`node_modules`, `dist`, Android build trees, replay logs, zips) were ignored. Secrets are not reproduced; only environment **variable names** are listed.

**Fact vs inference:** Statements grounded in code are written as facts. Reasonable inferences are labeled **(inference)**. Unknowns are marked **Not identifiable from the repository.**

---

## 13. Executive summary

Decor Drapes Instyle runs a blinds/drapes business stack on a **shared Firebase project**. **Legend_Quotation** is the main admin workspace: create quotations (measurement-based pricing), convert to invoices, track payments/ledger, manage customers/products/inventory, run a production order workflow, and maintain public-site content (products, “our work,” contacts, testimonials, users). A **Puppeteer PDF** service and a **Nodemailer** email/user-deletion service sit beside the React frontend. **Inventory-Emplyee** is a mobile-oriented app for `admin`/`production` staff to adjust stock, view products/groups, and see notifications/transactions against the same `quotations/*` inventory paths. **Decor Drapes Instyle - Public App** is a Capacitor Android/web client focused on the **customer Profile** experience: login (email/Google), view pricelist, own quotations, submit order requests, and edit profile — with IndexedDB offline cache and a pending-ops sync queue. All three apps share Firebase Auth roles under `users/{uid}` and Cloudinary for image uploads. There are **no automated test suites** of substance in these trees. Local run is Vite/npm for frontends; Legend also uses `server.bat` to start static serve + two Node servers.

---

## Ecosystem architecture (how the three apps relate)

```
                    ┌─────────────────────────────────────┐
                    │  Firebase Auth + Realtime Database  │
                    │  (same VITE_FIREBASE_PROJECT_ID)     │
                    │  users/, quotations/*, pricelist/,  │
                    │  orderRequest/, ledger/, invoices/  │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
 ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────────┐
 │ Public App          │ │ Inventory-Emplyee   │ │ Legend_Quotation        │
 │ (customers)         │ │ (staff inventory)   │ │ (admin + production)    │
 │ Capacitor / Vite    │ │ Capacitor / Vite    │ │ Vite SPA + Express×2    │
 └──────────┬──────────┘ └──────────┬──────────┘ └────────────┬────────────┘
            │                       │                         │
            ▼                       ▼                         ▼
       Cloudinary              Cloudinary              Cloudinary
                                                          │
                                    ┌─────────────────────┴─────────────────────┐
                                    ▼                                           ▼
                         backend/: PDF + OG (Puppeteer)          frontend/backend/: SMTP +
                         POST /generate-pdf, /generate-og        admin user delete / email
```

**Confirmed:** All three `.env` files use the **same** `VITE_FIREBASE_PROJECT_ID` value.

**(Inference):** These are layers of one product: public customer portal, warehouse/floor inventory tool, and office/admin quotation system — not three unrelated products.

---

# A. Decor Drapes Instyle - Public App

## 1. Project purpose

| | |
|--|--|
| **What it is** | React/Vite + Capacitor app (“RJS Instyle”, `com.decordrapesinstyle.app`) centered on a customer **Profile** portal. |
| **Problem it solves** | Lets customers sign in, see pricelist/quotations/order requests, update profile, and work **offline** on Android without needing the full public website. |
| **Who uses it** | Customers (and any authenticated Firebase user). README describes packaging Profile + Login as an Android APK while keeping a separate website untouched. |

**Evidence:** `README.md` goal statement; `App.tsx` routes only Login/Profile; package name / `capacitor.config.ts` `appName: 'RJS Instyle'`.

## 2. Project architecture

- **UI:** React 19 + React Router (`HashRouter` on native, `BrowserRouter` on web).
- **Auth:** Firebase Auth with durable persistence (`initializeAuth` + IndexedDB/local/session/memory fallbacks) for Capacitor WebView survival.
- **Data:** Firebase Realtime Database; Cloudinary for profile images.
- **Offline:** IndexedDB (`idb`) stores: `profile`, `pricelist`, `quotations`, `orderRequests`, `pendingOps`; Cap Network listener drains queue.
- **Native:** Capacitor 6 plugins (App, Network, Preferences, StatusBar, Navigation Bar, Google Auth).

**Major components**

| Component | Role |
|-----------|------|
| `AuthContext` | Login/signup/logout, profile update via offline layer |
| `Login` | Email/password + Google (native plugin vs web popup) |
| `Profile` | Large tabbed UI: home, pricelist, quotations, profile |
| `offline/profileStore` | Subscribe/cache RTDB paths; queue failed writes |
| `offline/sync` | Drain pending ops when online |
| `native/nativeChrome` | Status bar theme, Android back button |

## 3. Directory structure

```
Decor Drapes Instyle - Public App/
├── src/
│   ├── components/auth/     # Login, ProtectedRoute, helper
│   ├── components/common/   # Spinner, ThemeToggle
│   ├── config/              # firebase.ts, cloudinary.ts
│   ├── context/             # AuthContext, ThemeContext
│   ├── native/              # Status bar / back button
│   ├── offline/             # storage, sync, profileStore
│   ├── pages/Profile.tsx    # Main app surface
│   ├── types/index.ts
│   ├── platform.ts          # isNative / isAndroid / isWeb
│   ├── App.tsx, main.tsx
├── public/assets/image/     # Brand, favicons, sample PDF
├── resources/               # Capacitor splash/icons
├── scripts/build-assets.mjs
├── android/                 # Capacitor Android project (generated/native)
├── app_host/                # Hosted index + APK copy
├── capacitor.config.ts
├── package.json, vite.config.ts, README.md
└── .env
```

**Why key paths exist:** `offline/` implements the offline-first plan in README; `RJS Instyle App Key/` holds Android signing key material **(do not commit/share)**; `firebase-test.html` is a standalone Firebase check page.

## 4. Application flow

1. Boot → Router + ThemeProvider + AuthProvider.
2. `OfflineBoot` calls `initOfflineLayer()` (register pending-op handlers, drain queue) and wires Android back button.
3. Auth: `onAuthStateChanged` loads `users/{uid}` (with IndexedDB cache on profile updates).
4. **Native:** any route → logged-in `Profile` or `Login`.
5. **Web:** `/login`, `/profile` (ProtectedRoute), else redirect login.
6. Profile tabs pull pricelist (`pricelist`), user’s quotations (`quotations/quotationList` filtered by customer email), order requests (`orderRequest`), and write profile / order requests through offline helpers (Firebase first, else `pendingOps`).

## 5. Technologies

| Category | Stack |
|----------|--------|
| Languages | TypeScript, CSS (Tailwind) |
| UI | React 19, react-router-dom 7, lucide-react, react-hot-toast |
| Build | Vite 8, PostCSS, Tailwind 3, ESLint |
| Mobile | Capacitor 6, @capacitor/assets, Sharp (asset script) |
| Backend-as-service | Firebase Auth + Realtime Database |
| Media | Cloudinary unsigned upload |
| Offline | `idb`, `@capacitor/network` |

## 6. Configuration

**Files:** `.env`, `capacitor.config.ts`, `vite.config.ts`, `tailwind.config.js`, `tsconfig*.json`, `capacitor-assets.config.t`.

**Environment variables (names only):**

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_GOOGLE_CLIENT_API_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`
- `VITE_FEATUREABLE_ID`, `VITE_MAINTENANCE_MODE`, `VITE_WEB3_FORM`

**Notable settings:** Google Auth `serverClientId` hardcoded in `capacitor.config.ts`; StatusBar overlays WebView for Android 15+ edge-to-edge.

## 7. APIs and integrations

| Integration | Usage |
|-------------|--------|
| Firebase Auth | Email/password, Google credential (native idToken / web popup) |
| Firebase RTDB | `users/`, `pricelist`, `quotations/quotationList`, `orderRequest` |
| Cloudinary | `POST .../image/upload` with upload preset |
| Capacitor Google Auth | Native Google Sign-In |

**Internal HTTP API:** None in this repo. Auth is Firebase client SDK.

## 8. Data

**Entities (from `types/index.ts` + offline store):** User (roles: admin/employee/customer/editor/viewer/production), Product/Cart/Order (broader CMS types present even if UI is profile-focused), Inventory*, SiteSettings, OrderRequest payloads under `orderRequest`.

**RTDB paths used in offline layer:**

- `users/{uid}`
- `pricelist`
- `quotations/quotationList` (filtered by `customer.email`)
- `orderRequest`

**Data flow:** RTDB → IndexedDB cache → UI; writes → IndexedDB → RTDB or `pendingOps` → sync on reconnect.

## 9. Testing

**Not identifiable from the repository** — no Vitest/Jest/Cypress suites; `package.json` has no test script. ESLint only.

## 10. Deployment and execution

```bash
npm install
npm run dev          # Vite
npm run build        # tsc -b && vite build
npm run preview
npm run assets:generate   # icons/splash for Capacitor
npx cap sync android
```

APK hosting artifacts exist under `app_host/`. Full Android Studio packaging is documented in `README.md` (JDK 17, Android SDK). Production hosting URL for this specific APK webDir: **Not identifiable from the repository** beyond Capacitor packaging.

## 11. Dependencies (important)

| Dependency | Why |
|------------|-----|
| `firebase` | Auth + RTDB |
| `@capacitor/*` | Native Android shell & plugins |
| `@codetrix-studio/capacitor-google-auth` | Native Google Sign-In |
| `idb` | Offline IndexedDB |
| `react-router-dom` | Routing |
| `lucide-react` / `react-hot-toast` | UI / feedback |

## 12. Observations

**Design decisions**

- Explicit Firebase Auth persistence for Capacitor process death (documented in `firebase.ts`).
- Offline-first profile/order-request writes.
- Profile page is very large (thousands of lines) — monolithic UI.

**Concerns**

- Signing key folder in tree; risk if synced to remote.
- Google `serverClientId` in source; rotate if leaked.
- Types include e-commerce/CMS models not all used by this slim App shell **(inference:** copied from larger website codebase).
- Capacitor README mentions v7; `package.json` uses Capacitor **6**.

**Unclear:** Exact maintenance-mode / Web3Forms / Featureable behavior without deeper Profile-branch reading of every env flag usage.

---

# B. Inventory-Emplyee

## 1. Project purpose

| | |
|--|--|
| **What it is** | Capacitor inventory app (“Inventory Drapes”, `com.decordrapesinstyle.inventory`) for staff. |
| **Problem it solves** | Mobile-friendly stock viewing/adjustment, product lists, auto-inventory, admin stock analytics, notifications tied to inventory transactions. |
| **Who uses it** | Users with Firebase role `admin` or `production` (ProtectedRoute default). Stock page further restricted to `admin`. |

README is only `main-inventory` — purpose is inferred from routes/hooks/capacitor config.

## 2. Project architecture

- **UI:** React 18 + custom in-app navigation (`NavigationContext`) — **not** react-router.
- **Auth:** Firebase Auth (lazy-loaded via `firebaseLoader`) + localStorage auth cache for fast cold start.
- **Data:** Same RTDB `quotations/inventory`, `manualInventory`, `inventoryGrp`, `inventoryTransactions`, `products`, `users`.
- **Caching:** In-memory/`cache.ts` for products/groups/stock to reduce flicker.
- **Native:** Capacitor 8 (Android, App, Browser, StatusBar); PWA files under `public/` (`manifest.webmanifest`, `sw.js`).

**Major components:** LoginPage, InventoryPage, ProductsPage, AutoInventory, StockPage (admin), Profile/EditProfile, NotificationsPage, AppNavigation, hooks (`useInventory`, `useAutoInventory`, `useProducts`, `useStockData`).

## 3. Directory structure

```
Inventory-Emplyee/
├── src/
│   ├── components/     # AppNavigation, ProtectedRoute, TransactionHistory, ui/
│   ├── config/         # firebase.ts, firebaseLoader.ts
│   ├── context/        # AuthContext, NavigationContext
│   ├── hooks/          # inventory / products / stock / theme
│   ├── lib/            # cache, utils
│   ├── pages/          # Login, Inventory, Products, AutoInventory, Stock, Profile, …
│   ├── App.tsx, main.tsx, statusBar.ts
├── public/             # PWA icons, sw.js, _redirects
├── assets/, icons/, resources/
├── android/
├── capacitor.config.ts, build.txt, vite.config.ts
└── .env
```

## 4. Application flow

1. AuthProvider hydrates from `auth:cache` if present → UI unblocks; Firebase loads in background and reconciles.
2. Unauthenticated → LoginPage; authenticated → Inventory (`/`) with bottom/side nav.
3. Protected pages require role ∈ {admin, production}; `/stock` requires admin.
4. Hooks subscribe to RTDB inventory paths, merge manual + auto products (manual wins on `productId` collision), support chunked UI loading, and write stock adjustments + transaction logs under `quotations/inventoryTransactions/{productId}`.

## 5. Technologies

| Category | Stack |
|----------|--------|
| Languages | TypeScript |
| UI | React 18, Tailwind, lucide-react, react-hot-toast, Radix Popover, react-day-picker, date-fns |
| Build | Vite 5, rollup-plugin-visualizer |
| Mobile | Capacitor 8 |
| Data | Firebase Auth + RTDB |
| Media | Cloudinary env present (profile images **(inference)**) |

## 6. Configuration

**Env names:** `VITE_API_URL`, Firebase `VITE_FIREBASE_*` set, `VITE_CLOUDINARY_*`.

**Capacitor:** minimal config (`webDir: 'dist'`).

**build.txt:** `npm run build` → `npx @capacitor/assets generate` → `npx cap sync android` → `npx cap open android`.

## 7. APIs and integrations

- Firebase Auth (email + Google popup).
- Firebase RTDB paths under `quotations/*` and `users/*`.
- `VITE_API_URL` present; **Not identifiable from the repository** whether a custom HTTP backend is actively called from inventory pages without exhaustive page greps — primary data path is Firebase.

## 8. Data

| Concept | Path / shape |
|---------|----------------|
| Auto inventory | `quotations/inventory` |
| Manual inventory | `quotations/manualInventory` |
| Groups | `quotations/inventoryGrp` |
| Product catalog costs | `quotations/products` |
| Transactions | `quotations/inventoryTransactions` |
| Users | `users/{uid}` with role |

Stock analytics aggregate inventory value and today add/reduce from transactions (`useStockData`).

## 9. Testing

No dedicated test framework usage found. `typecheck` script exists (`tsc --noEmit`).

## 10. Deployment and execution

```bash
npm install
npm run dev
npm run build
npm run preview
# then Capacitor Android steps from build.txt
```

PWA `_redirects` suggests Netlify-style static hosting possible. Exact production URL: **Not identifiable from the repository.**

## 11. Dependencies (important)

| Dependency | Why |
|------------|-----|
| `firebase` | Auth + live inventory |
| `@capacitor/*` | Android packaging |
| `date-fns` / `react-day-picker` | Date filtering in UI |
| `@radix-ui/react-popover` | Popovers |
| `clsx` / `tailwind-merge` | Class utilities |

## 12. Observations

- Auth cache speeds perceived login; must stay consistent with server role changes.
- Dual inventory sources (manual vs auto) merge logic is central and intentional.
- Folder name typo: `Emplyee`.
- README essentially empty.
- `useInventory.ts` uses top-level `await loadFirebase()` — relies on Vite async module handling.

---

# C. Legend_Quotation

## 1. Project purpose

| | |
|--|--|
| **What it is** | Full admin console for quotations/invoices/customers/accounts/inventory/production workflow, plus admin CMS for the public website, with Node PDF and email backends. |
| **Problem it solves** | End-to-end quote → confirm → invoice → payment → stock impact → production stages for a measurement-based drapery/blinds business. |
| **Who uses it** | Firebase users with role `admin` (full console) or `production` (Order Workflow only). Deployed domains referenced in CORS: `quotation.decordrapesinstyle.com`, `decordrapesinstyle.com`, `admin.decordrapesinstyle.com`. |

`backend/package.json` description: “Backend server for Legend - Quotation project”; author “Decor Drapes Instyle”.

## 2. Project architecture

```
Legend_Quotation/
├── frontend/          # React SPA (primary UI)
│   └── backend/       # Express + Nodemailer + Firebase Admin (email / user delete)
├── backend/           # Express + Puppeteer (PDF + OG image)
└── server.bat         # Starts serve(dist):5173 + both Node servers
```

**Frontend:** React 18, React Router, lazy-loaded tabs, Auth/Confirm/HeaderActions contexts, large `firebaseService.ts`, client PDF/print helpers, Zustand-like `store/`, production order workflow module.

**Access gate (`App.tsx`):** `canAccessApp = admin || production`; production-only users only see `/orders`.

## 3. Directory structure (important)

```
Legend_Quotation/
├── backend/
│   ├── server.js              # POST /generate-pdf, /generate-og
│   ├── pdf/generatePdf.js + template/
│   ├── og/generateOg.js
│   ├── logger.js, logs.txt
│   └── .env                   # FIREBASE_SERVICE_ACCOUNT_JSON, etc.
├── frontend/
│   ├── src/
│   │   ├── components/        # Dashboard, NewQuotation, Inventory*, Accounts,
│   │   │                      # Invoices, production/*, admin/*
│   │   ├── services/          # firebaseService, pdfService, ledgerPdfService,
│   │   │                      # orderWorkflowService
│   │   ├── config/            # firebase, cloudinary
│   │   ├── context/, hooks/, store/, types/, utils/, pdf-template/
│   │   └── App.tsx
│   ├── backend/server.js      # /api/send-email, delete-user*, cron
│   ├── public/                # PWA
│   └── .env, .env.production
└── server.bat
```

## 4. Application flow

**Admin session**

1. Login (Google/email via auth components) → load `users/{uid}` role.
2. Admin: sidebar → Dashboard / Quotations / Invoices / Customers / Accounts / Inventory / Orders / Settings / Website admin routes.
3. New quotation: select customer + products, compute sqft/running feet/addons/GST (`utils/calculations.ts`), save to `quotations/quotationList`, may adjust inventory.
4. Confirm / invoice / payments → `invoices/`, `ledger/payments`, quotation payment fields.
5. PDF: client print templates and/or `VITE_API_URL` → backend `/generate-pdf` (Puppeteer).
6. Production: order workflow stages pending → … → ready (ship/collect).

**Email backend:** Authenticated admin can schedule/delete users; public `/api/send-email`; cron sweeper for `pendingDeletions`.

## 5. Technologies

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite 7, Tailwind, react-router-dom 7, recharts, lucide-react, date-fns/dayjs, QR (`qrcode.react`), multiple PDF libs (jspdf, html2pdf, @react-pdf/renderer, html-to-image) |
| PDF server | Express 5, Puppeteer, firebase-admin, cors, dotenv |
| Email server | Express 4, nodemailer, firebase-admin |
| Cloud | Firebase Auth/RTDB, Cloudinary, CORS implies Railway (`RAILWAY_ENV`) for PDF backend |
| Optional | googleapis / gapi-script (Sheets-related capability in deps — **usage depth not fully audited**) |
| PWA | `vite-plugin-pwa` in package.json; `public/sw.js` present |

## 6. Configuration

**Frontend env:** Firebase `VITE_*`, Cloudinary, `VITE_API_URL` (production `.env.production` overrides API URL).

**PDF backend env:** `PORT` (default 4000), `RAILWAY_ENV`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_DB_URL`.

**Email backend env:** SMTP_*, `PORT` (default 5001), Firebase Admin credential fields.

**CORS allowlists** hardcode Decor Drapes domains + localhost Vite ports.

## 7. APIs and integrations

### Internal — PDF backend (`Legend_Quotation/backend`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/generate-pdf` | Puppeteer A4 PDF from quotation HTML template |
| POST | `/generate-og` | PNG OG image from HTML |

### Internal — Email backend (`frontend/backend`)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/send-email` | None in handler (open send) |
| POST | `/api/delete-user` | Bearer Firebase ID token + admin role |
| POST | `/api/delete-user/cancel` | Auth + admin |
| POST | `/api/delete-user/confirm` | Auth + admin |
| GET | `/api/cron/process-deletions` | Public (intended for external cron) |
| GET | `/api/health` | Public |

### External

- Firebase Auth / RTDB (primary datastore).
- Cloudinary uploads.
- SMTP for outbound mail.

**Auth mechanisms:** Client Firebase Auth; email backend verifies ID tokens and checks `users/{uid}.role === 'admin'` for destructive routes.

## 8. Data

**Core RTDB layout (from `firebaseService.ts`):**

| Path | Purpose |
|------|---------|
| `quotations/quotationList` | Quotations |
| `quotations/deletedQuotes` | Soft-deleted quotes |
| `quotations/customers` | Customers |
| `quotations/products` | Product catalog |
| `quotations/inventory` | Auto stock |
| `quotations/manualInventory` | Manual stock |
| `quotations/inventoryTransactions/{product}` | Stock ledger |
| `quotations/inventoryGrp` | Groups |
| `quotations/meta` | Company / UPI / last quotation number |
| `quotations/customerAccounts` | Legacy payments (migration helpers) |
| `invoices/{invoiceNumber}` | Invoices |
| `invoiceMeta/lastNumber` | Invoice counter |
| `ledger/payments` | Payment ledger |
| `users/{uid}` | Profiles + roles |
| `pendingDeletions/{uid}` | Scheduled Auth/DB user deletion |
| `orderRequest` | Customer order requests (consumed by admin OrderRequestsTab; also written by Public App) |
| `pricelist` | Used by Public App; CMS may manage related catalog **(inference)** |

**Domain models:** `Quotation`, `Customer`, `Product`, `QuotationMeta`, payment/invoice types, inventory types, `OrderWorkflowEntry` (stages, delivery method, item snapshots).

## 9. Testing

- Backend `package.json` lists `"test": "jest"` but **no Jest test files / jest config found** in the inspected tree → effectively **no implemented automated tests**.
- Frontend: lint + `typecheck` only.

## 10. Deployment and execution

**Frontend**

```bash
cd frontend
npm install
npm run dev
npm run build / build:prod
npm run preview
```

**PDF backend**

```bash
cd backend
npm install
npm start   # node server.js — PORT 4000 default
```

**Email backend**

```bash
cd frontend/backend
npm install
npm start   # PORT 5001 default
```

**All-in-one (Windows):** `server.bat` serves `frontend/dist` on 5173, starts both Node servers, opens browser.

Production: CORS + `RAILWAY_ENV` imply Railway (or similar) for PDF service; static frontend on `quotation.decordrapesinstyle.com` **(inference from CORS + env).** Exact CI/CD: **Not identifiable from the repository.**

## 11. Dependencies (important)

| Dependency | Why |
|------------|-----|
| `firebase` / `firebase-admin` | Client + privileged ops |
| `puppeteer` | Server PDF/OG |
| `nodemailer` | Contact/admin email |
| `recharts` | Dashboard charts |
| PDF libraries | Browser print / PDF export |
| `cloudinary` | Image pipeline (deps include server SDK too) |
| `express` + `cors` | HTTP APIs |

## 12. Observations

**Design decisions**

- Role-split UI (admin vs production-only) in one SPA.
- Inventory dual paths shared with Inventory app.
- Payment ledger migration helpers (`migrateLegacyPaymentsToLedger`).
- Order workflow freezes line-item snapshots so later catalog edits don’t rewrite production cards.

**Concerns**

- `/api/send-email` has no `requireAuth` — spam/abuse risk if exposed publicly.
- `/api/cron/process-deletions` is unauthenticated by design (security via obscurity / network controls — verify in deploy).
- Nested `frontend/backend` + root `backend` is easy to confuse.
- `backend-bkp.zip` and `logs.txt` in tree — avoid shipping secrets/logs.
- Heavy client bundles (manualChunks for firebase/pdf/charts) — operational complexity.
- Duplicate Login components (`components/Login.tsx` vs `components/auth/Login.tsx`).

**Unclear:** Full Google Sheets sync usage; whether `SettingsManagement.tsx` from older `tree.txt` was removed (current tree has SettingsTab + admin modules without that exact filename).

---

## Cross-cutting: Technologies summary

| | Public App | Inventory-Emplyee | Legend_Quotation |
|--|------------|-------------------|------------------|
| Primary language | TypeScript | TypeScript | TypeScript + JS (backends) |
| UI | React 19 | React 18 | React 18 |
| Bundler | Vite 8 | Vite 5 | Vite 7 |
| Mobile | Capacitor 6 | Capacitor 8 | Web/PWA (no Capacitor root) |
| DB | Firebase RTDB | Firebase RTDB | Firebase RTDB |
| Auth | Firebase (+ Google native) | Firebase (+ Google) | Firebase (+ Admin on servers) |
| Images | Cloudinary | Cloudinary | Cloudinary |
| Extra servers | — | — | Puppeteer PDF, Nodemailer |

## Cross-cutting: Testing

Across all three projects: **no meaningful automated test suites found.** Quality relies on TypeScript, ESLint, and manual QA.

## Cross-cutting: Security notes (observations)

- Shared Firebase project means security rules (not in these repos) are critical; client apps write inventory/quotations directly.
- Env files and service-account JSON / signing keys exist on disk — treat as secrets.
- Public email endpoint and public cron endpoint need deployment hardening.

---

## Document metadata

| Field | Value |
|-------|--------|
| Generated for | `E:\Decor Drapes Instyle - Public App`, `E:\Inventory-Emplyee`, `E:\Legend_Quotation` |
| Canonical copy | `E:\Legend_Quotation\PROJECT_RESEARCH.md` (also mirrored to `E:\PROJECT_RESEARCH.md` when writable) |
| Prompt source | `E:\prompt.txt` |
| Limitation | Android/native generated trees and `node_modules` not fully walked; some optional integrations (Sheets, Featureable, Web3Forms) only partially characterized |
