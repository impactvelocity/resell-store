CREATE TABLE "api_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key_id" text NOT NULL,
	"key_kind" text NOT NULL,
	"client" text,
	"action" text NOT NULL,
	"text" text NOT NULL,
	"href" text,
	"asked_first" boolean DEFAULT false NOT NULL,
	"ok" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_client" (
	"key_id" text NOT NULL,
	"client" text NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_client_key_id_client_pk" PRIMARY KEY("key_id","client")
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp,
	"last_status" integer,
	"last_error" text,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "max_offer_cents" integer;--> statement-breakpoint
ALTER TABLE "webhook_endpoint" ADD COLUMN "failing_since" timestamp;--> statement-breakpoint
ALTER TABLE "api_activity" ADD CONSTRAINT "api_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_activity" ADD CONSTRAINT "api_activity_key_id_api_key_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_client" ADD CONSTRAINT "api_client_key_id_api_key_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_activity_user_idx" ON "api_activity" USING btree ("user_id","key_kind","created_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_due_idx" ON "webhook_delivery" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_user_idx" ON "webhook_delivery" USING btree ("user_id","created_at");