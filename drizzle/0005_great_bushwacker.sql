CREATE TABLE "game_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer,
	"user_id" integer,
	"avg_rtt" real NOT NULL,
	"p95_rtt" real NOT NULL,
	"avg_jitter" real NOT NULL,
	"p95_jitter" real NOT NULL,
	"avg_fps" real NOT NULL,
	"min_fps" real NOT NULL,
	"browser" varchar(200) NOT NULL,
	"viewport_width" integer NOT NULL,
	"viewport_height" integer NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_value" real NOT NULL,
	"metric_type" varchar(20) NOT NULL,
	"attributes" jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_metrics" ADD CONSTRAINT "game_metrics_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_metrics" ADD CONSTRAINT "game_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gm_created_at_idx" ON "game_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gm_game_id_idx" ON "game_metrics" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "sm_recorded_at_idx" ON "server_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "sm_metric_name_idx" ON "server_metrics" USING btree ("metric_name");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "language";