CREATE TABLE `edition_absence` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`attendee_id` text NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `edition`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attendee_id`) REFERENCES `attendee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `edition_absence_unq` ON `edition_absence` (`edition_id`,`attendee_id`);--> statement-breakpoint
ALTER TABLE `invite_code` ADD `attendee_id` text REFERENCES attendee(id);--> statement-breakpoint
-- Backfill: accounts created before People and logins were one list. First link each account
-- to the person of the same name (only when that name is unambiguous and unclaimed)…
UPDATE `attendee` SET `user_id` = (
	SELECT u.`id` FROM `user` u WHERE lower(u.`display_name`) = lower(`attendee`.`name`)
)
WHERE `user_id` IS NULL
	AND (SELECT count(*) FROM `user` u WHERE lower(u.`display_name`) = lower(`attendee`.`name`)) = 1
	AND (SELECT count(*) FROM `attendee` a2 WHERE lower(a2.`name`) = lower(`attendee`.`name`)) = 1
	AND (
		SELECT u.`id` FROM `user` u WHERE lower(u.`display_name`) = lower(`attendee`.`name`)
	) NOT IN (SELECT `user_id` FROM `attendee` WHERE `user_id` IS NOT NULL);--> statement-breakpoint
-- …then add a person for every account still without one, so nobody has to be added by hand.
INSERT INTO `attendee` (`id`, `name`, `active`, `user_id`, `created_at`)
SELECT
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2)
		|| '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2)
		|| '-' || hex(randomblob(6))),
	u.`display_name`,
	1,
	u.`id`,
	unixepoch()
FROM `user` u
WHERE u.`id` NOT IN (SELECT `user_id` FROM `attendee` WHERE `user_id` IS NOT NULL);