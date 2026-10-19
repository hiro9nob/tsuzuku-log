CREATE TABLE `entries` (
	`habit_id` text NOT NULL,
	`day` text NOT NULL,
	`status` text NOT NULL,
	`value` real DEFAULT 1 NOT NULL,
	`recorded_at` text NOT NULL,
	PRIMARY KEY(`habit_id`, `day`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entries_day_idx` ON `entries` (`day`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`kind` text NOT NULL,
	`target` real DEFAULT 1 NOT NULL,
	`step` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`limit_period` text DEFAULT 'day' NOT NULL,
	`schedule` text NOT NULL,
	`reminders` text DEFAULT '[]' NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`start_day` text NOT NULL,
	`celebrated` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`day` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_habit_day_idx` ON `notes` (`habit_id`,`day`);