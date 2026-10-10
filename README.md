# MALIKA — متجر أزياء فاخر | Luxury Fashion E-commerce

A fully bilingual (عربي / English) luxury fashion storefront with a complete admin dashboard.
Next.js · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL (embedded PGlite for local dev).

---

## التشغيل | Getting started

```bash
npm install          # التثبيت
npm run db:migrate   # إنشاء قاعدة البيانات
npm run db:seed      # بيانات تجريبية واقعية (عربي + إنجليزي)
npm run dev          # http://localhost:3000
```

Other scripts: `npm run lint` · `npm run typecheck` · `npm run build` · `npm run start`

For a real PostgreSQL server, set `DATABASE_URL` in `.env` — otherwise an embedded PGlite
database is created in `.data/pglite` automatically.

---

## الحسابات التجريبية | Demo accounts

| الدور | البريد | كلمة المرور |
|---|---|---|
|Super admin (كل الصلاحيات)|`super-admin@malika.test`|`Malika#Admin2026`|
|مدير عمليات|`operations-manager@malika.test`|`Malika#Admin2026`|
|مدير مخزون|`inventory-manager@malika.test`|`Malika#Admin2026`|
|مدير تسويق|`marketing-manager@malika.test`|`Malika#Admin2026`|
|مدير مبيعات|`sales-manager@malika.test`|`Malika#Admin2026`|
|خدمة عملاء|`customer-care@malika.test`|`Malika#Admin2026`|
|مراجع مالي|`finance-reviewer@malika.test`|`Malika#Admin2026`|

عميل تجريبي | Customer: `demo@malika.test` / `Malika#2026`

---

## إشعارات الطلبات الجديدة بالبريد | New-order email alerts

أول ما عميل يُتمّ طلب، بيوصل إيميل بكل التفاصيل (العميل، العنوان، المنتجات، الإجمالي، ولينك مباشر للطلب في الداشبورد).

1. أضف بيانات SMTP في `.env` (أو في Environment Variables على الاستضافة) ثم أعد تشغيل الموقع:
   `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` (انظر `.env.example`). مع Gmail استخدم **App Password** وليس كلمة السر العادية.
2. من الداشبورد: **الإعدادات ← إشعارات الطلبات الجديدة بالبريد** — أضف/احذف الإيميلات، فعّل/عطّل الإشعارات، وجرّب زر «إرسال رسالة تجريبية».
3. فشل الإيميل لا يؤثر على الطلب أبداً (يُرسل بعد حفظ الطلب، والخطأ يُسجَّل في logs الخادم فقط).

Every placed order emails the recipients managed in **Admin → Settings → New-order email alerts** (SMTP configured via env vars).

---

## المتجر | Storefront

`/` الرئيسية · `/shop` المتجر · `/men` · `/women` · `/collections` · `/products/[slug]`
`/search` · `/cart` · `/checkout` · `/account` · `/about` · `/contact` · `/faq` · `/privacy` · `/terms`

كل المحتوى (الأقسام الرئيسية، القوائم، البانرات، الصفحات، المنتجات) يُدار من لوحة التحكم —
CMS-driven, seeded bilingually (AR/EN). The AR|EN switcher switches direction (RTL/LTR) and persists.

## لوحة التحكم | Admin — `/admin`

Analytics (with date filters) · Products (with variants) · Inventory (with movement logs) ·
Categories · Collections · Homepage builder (drag & drop) · Hero & banners · Theme editor
(WCAG AA contrast guard) · Orders · Customers · Reviews · Coupons · Marketing · Media library ·
SEO · Navigation CMS · Pages CMS · Roles & permissions · Audit logs · Notifications · Settings.

Staff sessions use hashed passwords (bcrypt), RBAC permissions, rate-limited login, secure
httpOnly cookies, and Zod-validated server actions. Every admin change is written to the audit log.

---

© 2026 MALIKA — Elegance, Reimagined.
