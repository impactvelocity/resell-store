ALTER TABLE "file" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "file" ADD COLUMN "storage_key" text;