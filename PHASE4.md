# MALIKA — Phase 4 (cart · wishlist · checkout · customer account)

## Run
    npm install
    cp .env.example .env.local      # set AUTH_SECRET (32+ chars) for production
    npm run db:seed                 # demo reset: wipes and reseeds everything
    npm run dev                     # or: npm run build && npm start

Demo customer: demo@malika.test / Malika#2026 (2 orders, wishlist, address, notifications)
Coupons: WELCOME10, MALIKA200, AW26 (collection-restricted), OUTERWEAR5 (category-restricted), OLDSALE (expired)

## Checks
    npm run typecheck && npm run lint && npm run build
    npx tsx scripts/verify-orders.ts   # 24 backend checks (pricing, coupons, stock, tracking)

## Design notes
- Browser stores only variant ids + quantities; prices/stock/coupon/shipping are re-derived on the server (src/server/services/cart.ts) and again inside the order transaction.
- Payments are providers (src/server/payments). Only cash on delivery is enabled; card/wallet are disabled placeholders.
- Delivery prices and the free-shipping threshold live in src/lib/shipping.ts (move to admin settings in Phase 10).
- Customer auth (scrypt + DB sessions) was pulled forward from Phase 5; admin auth/RBAC is still Phase 5/11.
- Rate limiting is in-memory (single instance).

## Not done yet
Quick view modal on product cards, wishlist price/stock notifications, transactional emails. Tested only on PGlite (not a real PostgreSQL server).
