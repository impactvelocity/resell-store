CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"shop_id" text NOT NULL,
	"listing_id" text,
	"visitor_id" text,
	"user_id" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourite" (
	"user_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favourite_user_id_listing_id_pk" PRIMARY KEY("user_id","listing_id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_shop_id_shop_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_shop_idx" ON "activity" USING btree ("shop_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "activity_listing_idx" ON "activity" USING btree ("listing_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "activity_visitor_idx" ON "activity" USING btree ("visitor_id","created_at");--> statement-breakpoint
CREATE INDEX "favourite_listing_idx" ON "favourite" USING btree ("listing_id");