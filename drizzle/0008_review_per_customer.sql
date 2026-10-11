-- Keep only the newest review when a customer somehow has several for one product, then enforce one review per customer per product.
DELETE FROM "review" r USING "review" newer
WHERE r."customer_id" IS NOT NULL
  AND r."customer_id" = newer."customer_id"
  AND r."product_id" = newer."product_id"
  AND (r."created_at", r."id") < (newer."created_at", newer."id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "review_customer_product_idx" ON "review" USING btree ("customer_id","product_id");
