CREATE TABLE "storefront_visit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visit_created_idx" ON "storefront_visit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "visit_visitor_idx" ON "storefront_visit" USING btree ("visitor_id");