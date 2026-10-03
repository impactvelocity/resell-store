CREATE TABLE "checkout" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_order_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"offer_id" text,
	"delivery" text NOT NULL,
	"pay_method" text NOT NULL,
	"ship_to" jsonb NOT NULL,
	"item_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"platform_fee_cents" integer NOT NULL,
	"payee_merchant_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paypal_account" (
	"user_id" text PRIMARY KEY NOT NULL,
	"merchant_id" text NOT NULL,
	"payments_receivable" boolean DEFAULT false NOT NULL,
	"email_confirmed" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payee_merchant_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "platform_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paypal_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "seller_net_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "released_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payout_ref" text;--> statement-breakpoint
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_account" ADD CONSTRAINT "paypal_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_provider_order_idx" ON "checkout" USING btree ("provider_order_id");