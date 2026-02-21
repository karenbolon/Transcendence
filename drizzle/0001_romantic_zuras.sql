CREATE TABLE "achievement_definitions" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"tier" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"achievement_id" varchar(50) NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player-progression" (
	"user_id" integer,
	"current_level" integer DEFAULT 0,
	"current_xp" integer DEFAULT 0,
	"total_xp" integer DEFAULT 0,
	"xp_to_next_level" integer DEFAULT 50,
	"current_win_streak" integer DEFAULT 0,
	"best_win_streak" integer DEFAULT 0,
	"total_points_scored" integer DEFAULT 0,
	"total_ball_returns" integer DEFAULT 0,
	"shutout_wins" integer DEFAULT 0,
	"comeback_wins" integer DEFAULT 0,
	"consecutive_days_played" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player-progression" ADD CONSTRAINT "player-progression_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;