CREATE TABLE `attendee` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`emoji` text,
	`color` text,
	`active` integer DEFAULT true NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `credential` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`device_name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `edition` (
	`id` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`title` text,
	`event_date` text,
	`notes` text,
	`champion_attendee_id` text,
	`point_scheme` text DEFAULT '[10,8,6,5,4,3,2,1]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`champion_attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `edition_year_unique` ON `edition` (`year`);--> statement-breakpoint
CREATE TABLE `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`paid_by_attendee_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paid_by_attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `expense_share` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`attendee_id` text NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_share_unq` ON `expense_share` (`expense_id`,`attendee_id`);--> statement-breakpoint
CREATE TABLE `game` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'individual' NOT NULL,
	`scoring_mode` text DEFAULT 'rank' NOT NULL,
	`higher_is_better` integer DEFAULT true NOT NULL,
	`point_scheme_override` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'setup' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_participant` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`attendee_id` text NOT NULL,
	`team` text,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_participant_unq` ON `game_participant` (`game_id`,`attendee_id`);--> statement-breakpoint
CREATE TABLE `invite_code` (
	`code` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`expires_at` integer,
	`used_by_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `match` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`round_name` text NOT NULL,
	`round_index` integer DEFAULT 0 NOT NULL,
	`slot` integer DEFAULT 0 NOT NULL,
	`a_attendee_id` text,
	`b_attendee_id` text,
	`a_score` integer,
	`b_score` integer,
	`winner_attendee_id` text,
	`next_match_id` text,
	`next_slot` integer,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`a_attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`b_attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `round` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`name` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rugby_match` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`home_score` integer,
	`away_score` integer,
	`kickoff` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `score` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`round_id` text,
	`attendee_id` text NOT NULL,
	`raw_value` real,
	`rank` integer,
	`league_points` real,
	FOREIGN KEY (`game_id`) REFERENCES `game`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `round`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_unq` ON `score` (`game_id`,`round_id`,`attendee_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `timeline_event` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`time` text NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`ref_id` text,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `venue` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`name` text NOT NULL,
	`arrive_time` text,
	`address` text,
	`map_url` text,
	`notes` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade
);
