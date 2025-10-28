CREATE TABLE `clarifications` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`field` text NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`answered_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clarifications_session_id_field_unique` ON `clarifications` (`session_id`,`field`);--> statement-breakpoint
CREATE TABLE `eye_settings` (
	`eye` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`description` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intent_confirmations` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`intent_analysis` text,
	`confirmation_prompt` text NOT NULL,
	`response` text,
	`user_identity` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`responded_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `personas` ADD `name` text NOT NULL;