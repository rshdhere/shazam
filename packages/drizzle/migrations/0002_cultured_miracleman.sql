CREATE TABLE "rate_limit_hits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rate_limit_hits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"client_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_client_idx" ON "rate_limit_hits" USING btree ("client_key","created_at");