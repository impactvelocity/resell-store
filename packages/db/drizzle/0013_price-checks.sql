CREATE TABLE "price_check" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"query" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'running' NOT NULL,
	"retail_cents" integer,
	"retail_source" text,
	"comps" jsonb,
	"error" text,
	"bought" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_check" ADD CONSTRAINT "price_check_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_check_user_idx" ON "price_check" USING btree ("user_id","created_at");