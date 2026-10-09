/** Unit price rules shared by the product page and the server-side cart, so they can never disagree. */
export function unitPrice(product: { priceMinor: number; salePriceMinor: number | null }, variant: { priceMinor: number | null }) {
  const base = variant.priceMinor ?? product.priceMinor;
  // A variant-level price override replaces the product price and is not discounted by the product sale price.
  const sale = variant.priceMinor ? null : product.salePriceMinor;
  const price = sale != null && sale < base ? sale : base;
  return { price, original: base, onSale: price < base };
}
