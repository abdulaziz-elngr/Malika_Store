# MALIKA — Phase 6 (admin dashboard foundation)

## What is new
- **Admin shell** (`src/features/admin/shell`): collapsible sidebar (remembered per browser), top bar, user menu, **command palette** (Ctrl/⌘ + K: jump to pages, switch language/theme, sign out), sign-out confirmation, and on phones a **slide-in drawer + bottom bar**. RTL-aware (drawers enter from the correct edge, icons mirror).
- **Permission-aware navigation** (`features/admin/nav.ts`): an entry is sent to the browser only if the role has `<resource>:view`. Screens that belong to later phases show as dimmed **"Soon"** entries — not links, so there are no dead routes. Flip `ready: true` when a phase ships its screens.
- **Overview dashboard** (`/admin`) — every number is a real query (`server/services/analytics.ts`):
  revenue, orders, average order value, conversion rate, new customers, live products; change vs the previous period of equal length;
  orders + revenue charts (accessible SVG with a hidden data table); top products; top categories; recent orders; recent customers; low-stock / sold-out variants; "needs attention" strip.
  Periods: Today · Yesterday · Last 7 days · Last 30 days · This month · Last month · This year · Custom range (validated, max 366 days). Days are Africa/Cairo calendar days (incl. daylight saving); the year view buckets by week.
- **Permissions hold at the data layer**: a block is only queried if the role may see it (Content Manager gets no revenue; Marketing gets no order figures; Inventory sees stock but not customers).
- **Audit log** (`/admin/audit`, needs `audit:view`): search, filter by area, paging (25), and a drawer with before/after values (secrets stay redacted).
- **My access** (`/admin/me`): the signed-in role and its real permission matrix.
- **UI kit** (`src/components/admin`): Drawer, Modal, ConfirmDialog (focus trap, Esc, scroll lock, focus restore), Card, PageHeader, Badge, EmptyState, Skeleton, table helpers. Route-level `loading.tsx` skeleton and `error.tsx` boundary with retry.
- **Conversion rate is real**: the storefront sends one anonymous beacon per browser session (`/api/track`, same-origin only, rate limited, honours Do Not Track, no personal data) into `storefront_visit`. Conversion = valid orders ÷ unique sessions.
- Seed now creates ~150 days of believable history (≈38 customers, ≈370 orders over their lifecycle, ≈14k sessions; deterministic) so charts are meaningful immediately.
- Migration `0003_analytics_visits`.

## Run
    npm install
    npm run db:seed         # resets demo data (never on production)
    npm run dev             # sign in at /en/admin/login — super-admin@malika.test / Malika#Admin2026

## Checks
    npm run lint && npm run typecheck && npm run build
    npm run verify          # orders + auth + dashboard suites (44 new dashboard checks)

## Definitions
- *Valid order*: every status except cancelled / returned. Revenue and AOV use valid orders only.
- *Low stock*: a published variant with 1–5 units (`LOW_STOCK_THRESHOLD`, becomes a setting with the inventory screens).

## Known limits
- Not exercised in a real browser here: the interactive parts (palette, drawers, sidebar collapse, hover tooltips) are type-checked, linted and server-rendered, but please click through them once.
- Admin notifications (new order, low stock, new review, …) and the in-app bell are not built yet; the dashboard "needs attention" strip covers pending orders, failed payments and stock for now.
- Charts keep a left-to-right time axis in Arabic too (numerals and dates are localised).
- Tested on PGlite; the order/auth suites also passed on PostgreSQL 16 in Phase 5, the new analytics SQL (date_trunc-free, `to_char … at time zone`) is plain PostgreSQL but has not been run on a real server yet.
- `/api/track` limiter is in-memory (per instance), like the other limiters.
