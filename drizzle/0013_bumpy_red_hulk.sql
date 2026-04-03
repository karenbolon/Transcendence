CREATE TABLE "tournament_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_invites_tournament_id_invited_user_id_unique" UNIQUE("tournament_id","invited_user_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) DEFAULT 'chat' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_messages" ADD CONSTRAINT "tournament_messages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_messages" ADD CONSTRAINT "tournament_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tm_tournament_idx" ON "tournament_messages" USING btree ("tournament_id");