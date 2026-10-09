CREATE TABLE "lookups" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"media_id" text NOT NULL,
	"link_url" text NOT NULL,
	"status" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "matches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lookup_id" text NOT NULL,
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"album" text,
	"artwork_url" text,
	"isrc" text,
	"spotify_url" text,
	"apple_music_url" text,
	"youtube_url" text,
	"timestamp_seconds" real NOT NULL,
	"confidence" real NOT NULL,
	"engine" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_lookup_id_lookups_id_fk" FOREIGN KEY ("lookup_id") REFERENCES "public"."lookups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lookups_link_idx" ON "lookups" USING btree ("platform","media_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lookups_one_running_per_link" ON "lookups" USING btree ("platform","media_id") WHERE "lookups"."status" in ('queued', 'fetching', 'listening');--> statement-breakpoint
CREATE INDEX "matches_lookup_idx" ON "matches" USING btree ("lookup_id");