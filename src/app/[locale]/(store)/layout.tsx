import { Loader } from "@/components/brand/loader";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CustomCursor } from "@/components/motion/custom-cursor";
import { VisitBeacon } from "@/features/storefront/analytics/visit-beacon";
import { CartDrawer } from "@/features/storefront/cart/cart-drawer";
import { CartProvider } from "@/features/storefront/cart/cart-provider";
import { WishlistProvider } from "@/features/storefront/wishlist/wishlist-provider";

/** Storefront chrome: header, footer, cart drawer and the cart/wishlist state. The admin area has its own layout. */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <WishlistProvider>
      <CartProvider>
        <VisitBeacon />
        <Loader />
        <CustomCursor />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <CartDrawer />
      </CartProvider>
    </WishlistProvider>
  );
}
