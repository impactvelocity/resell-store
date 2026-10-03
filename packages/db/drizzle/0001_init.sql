CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"slug" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'everyone' NOT NULL,
	"step" text DEFAULT 'research' NOT NULL,
	"prompt" text,
	"name" text,
	"title" text,
	"one_liner" text,
	"description" text,
	"category" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_cents" integer,
	"lowest_cents" integer,
	"shipping_cents" integer,
	"take_offers" boolean DEFAULT true NOT NULL,
	"tone" text,
	"findings" jsonb,
	"published_at" timestamp,
	"sold_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce("listing"."title", '') || ' ' || coalesce("listing"."name", '')), 'A') || setweight(to_tsvector('english', coalesce("listing"."one_liner", '') || ' ' || coalesce("listing"."category", '')), 'B') || setweight(to_tsvector('english', coalesce("listing"."description", '')), 'C')) STORED,
	"embedding" vector(1024)
);
--> statement-breakpoint
CREATE TABLE "listing_copy" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"tone" text NOT NULL,
	"title" text NOT NULL,
	"one_liner" text NOT NULL,
	"description" text NOT NULL,
	"teaser" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_message" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"step" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"file_id" text,
	"url" text,
	"source" text,
	"alt" text,
	"is_video" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_run" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shop" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"about" text,
	"category" text,
	"tone" text DEFAULT 'lemon' NOT NULL,
	"picture_file_id" text,
	"location" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"answer_questions" boolean DEFAULT true NOT NULL,
	"haggle" boolean DEFAULT true NOT NULL,
	"lowest_percent" integer DEFAULT 15 NOT NULL,
	"ask_hold" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"preferred_mode" text,
	"onboarded_at" timestamp,
	"about" text,
	"location" text,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"notify_prefs" jsonb,
	"writing_style" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing" ADD CONSTRAINT "listing_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_copy" ADD CONSTRAINT "listing_copy_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_message" ADD CONSTRAINT "listing_message_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photo" ADD CONSTRAINT "listing_photo_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_photo" ADD CONSTRAINT "listing_photo_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_run" ADD CONSTRAINT "research_run_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop" ADD CONSTRAINT "shop_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop" ADD CONSTRAINT "shop_picture_file_id_file_id_fk" FOREIGN KEY ("picture_file_id") REFERENCES "public"."file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_shop_idx" ON "listing" USING btree ("shop_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_shop_slug_idx" ON "listing" USING btree ("shop_id","slug");--> statement-breakpoint
CREATE INDEX "listing_search_idx" ON "listing" USING gin ("search");--> statement-breakpoint
CREATE INDEX "listing_embedding_idx" ON "listing" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "listing_copy_listing_idx" ON "listing_copy" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "listing_message_idx" ON "listing_message" USING btree ("listing_id","step","created_at");--> statement-breakpoint
CREATE INDEX "listing_photo_listing_idx" ON "listing_photo" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "research_run_listing_idx" ON "research_run" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_slug_idx" ON "shop" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shop_owner_idx" ON "shop" USING btree ("owner_id");