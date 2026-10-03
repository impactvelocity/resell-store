CREATE TABLE "dispute" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"source" text DEFAULT 'buyer' NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"offer_cents" integer,
	"provider_dispute_id" text,
	"escalated_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_event" (
	"id" text PRIMARY KEY NOT NULL,
	"dispute_id" text NOT NULL,
	"side" text NOT NULL,
	"author_id" text,
	"kind" text NOT NULL,
	"body" text,
	"amount_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notice" (
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notice_kind_ref_id_pk" PRIMARY KEY("kind","ref_id")
);
--> statement-breakpoint
CREATE TABLE "paypal_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"resource_id" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_ref" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_event" ADD CONSTRAINT "dispute_event_dispute_id_dispute_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."dispute"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_event" ADD CONSTRAINT "dispute_event_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_one_live_per_order_idx" ON "dispute" USING btree ("order_id") WHERE "dispute"."status" in ('open', 'escalated');--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_provider_idx" ON "dispute" USING btree ("provider_dispute_id");--> statement-breakpoint
CREATE INDEX "dispute_status_idx" ON "dispute" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "dispute_event_dispute_idx" ON "dispute_event" USING btree ("dispute_id","created_at");--> statement-breakpoint
CREATE INDEX "paypal_event_type_idx" ON "paypal_event" USING btree ("type","received_at");