CREATE TABLE `manual_result` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`attendee_id` text NOT NULL,
	`position` integer NOT NULL,
	`points` real,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manual_result_unq` ON `manual_result` (`edition_id`,`attendee_id`);--> statement-breakpoint
ALTER TABLE `attendee` ADD `photo` text;--> statement-breakpoint
ALTER TABLE `venue` ADD `category` text DEFAULT 'pub' NOT NULL;