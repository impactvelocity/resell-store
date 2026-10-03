ALTER TABLE "message" ADD COLUMN "by_agent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "countered_by" text;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "agent_note" text;--> statement-breakpoint
ALTER TABLE "thread" ADD COLUMN "last_by_agent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "thread" ADD COLUMN "needs_seller" boolean DEFAULT false NOT NULL;