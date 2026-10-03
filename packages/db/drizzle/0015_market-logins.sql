CREATE TABLE "market_login" (
	"user_id" text NOT NULL,
	"site" text NOT NULL,
	"connection_id" text NOT NULL,
	"profile_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"connected_at" timestamp,
	"checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "market_login_user_id_site_pk" PRIMARY KEY("user_id","site")
);
--> statement-breakpoint
ALTER TABLE "market_login" ADD CONSTRAINT "market_login_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;