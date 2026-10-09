# MALIKA — Phase 5 (database · authentication · backend foundation)

## What is new
- **Staff accounts, roles, permissions** — `admin_user`, `role`, `permission`, `role_permission` (migration `0002_admin_security`).
  Catalogue in `src/lib/permissions.ts`: 21 areas x (view/create/edit/delete/publish/manage_settings) = 96 permissions.
  7 system roles (Super Admin, Admin, Manager, Content Manager, Marketing Manager, Inventory Manager, Customer Support); custom roles are supported by the schema (UI comes in Phase 11).
- **Staff sign-in** — separate from customers: own cookie (`malika_admin`, httpOnly, SameSite=Strict), 8 h absolute + 2 h idle lifetime, sessions stored hashed.
  Lockout: 5 wrong passwords -> 15 min. One generic error for every failure (no account enumeration). Staff password policy: 12+ chars, upper + lower + number.
- **Enforcement** — `requirePermission()` for pages, `authorize()` for server actions / route handlers (src/server/auth/rbac.ts). Hiding a button is never the boundary.
- **Audit log** — `audit_log` with actor snapshot, entity, before/after (secrets redacted), IP; `recordAudit(tx, actor, …)` joins the caller's transaction. Sign-in/out and staff creation are already logged.
- **Login activity** — every staff and customer sign-in attempt (success, reason, IP, user agent).
- **Hardening** — security headers on every response (CSP, HSTS, X-Frame-Options, nosniff, Referrer/Permissions-Policy), `no-store` on /admin and /account, CSRF helper for route handlers, expired customer sessions purged on login.
- **Production database** — pooled `pg` connection (`DATABASE_POOL_MAX`), refuses to start in production without `DATABASE_URL`.
- **Routes** are split into `(store)` and `(admin)` groups, so admin pages have no storefront chrome.
- `/[locale]/admin/login`, `/admin` (shows your real permission matrix), `/admin/forbidden`. The full dashboard is Phase 6.

## Run
    npm install
    npm run db:seed        # dev/demo: resets everything, creates one demo staff account per role
    npm run dev
Demo staff: `<role>@malika.test` / `Malika#Admin2026`, e.g. `super-admin@malika.test`, `customer-support@malika.test`.

## Production
    DATABASE_URL=postgres://… AUTH_SECRET=… npm run db:migrate
    ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm run db:bootstrap   # first Super Admin; nothing is hardcoded
    npm run build && npm start
Do NOT run `db:seed` against production: it truncates tables.
To try a production build locally without PostgreSQL: `ALLOW_EMBEDDED_DB=1`.

## Verification
    npm run typecheck && npm run lint && npm run build
    npx tsx scripts/verify-auth.ts     # 32 checks: RBAC presets, lockout, audit, crypto
    npx tsx scripts/verify-orders.ts   # 24 checks: pricing, coupons, stock, tracking
Both scripts also pass on PostgreSQL 16; an 8-way parallel race on the last unit gave 1 order and stock 0.

## Known limits
- Rate limiting is in memory (per server instance). Use a shared store before running several instances.
- CSP still allows inline scripts (Next.js bootstrap); a nonce-based policy is a later step.
- No password reset / 2FA yet; no UI to manage staff and roles yet (Phase 11).
- Customer password reset and email sending are not built.
