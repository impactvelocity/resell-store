CREATE TABLE "offer" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"shop_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"counter_cents" integer,
	"note" text,
	"deposit_cents" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"shop_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"offer_id" text,
	"item_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"delivery" text NOT NULL,
	"pay_method" text NOT NULL,
	"ship_to" jsonb NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"payment_provider" text DEFAULT 'mock' NOT NULL,
	"payment_ref" text,
	"tracking_number" text,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_listing_idx" ON "offer" USING btree ("listing_id","status");--> statement-breakpoint
CREATE INDEX "offer_buyer_idx" ON "offer" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "offer_shop_idx" ON "offer" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "orders_buyer_idx" ON "orders" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_shop_idx" ON "orders" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_one_per_listing_idx" ON "orders" USING btree ("listing_id") WHERE "orders"."status" not in ('refunded', 'cancelled');