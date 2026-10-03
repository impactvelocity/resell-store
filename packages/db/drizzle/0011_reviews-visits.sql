CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"shop_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"public" boolean DEFAULT true NOT NULL,
	"seller_reply" text,
	"replied_at" timestamp,
	"hidden_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "account_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "follow_mailed_at" timestamp;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_order_idx" ON "review" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "review_shop_idx" ON "review" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "review_listing_idx" ON "review" USING btree ("listing_id");