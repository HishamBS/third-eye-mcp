CREATE TABLE `persona_blueprints` (
	`eye_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`version` text NOT NULL,
	`capabilities` text NOT NULL,
	`mission` text NOT NULL,
	`phases` text NOT NULL,
	`envelope_contract` text NOT NULL,
	`reminders` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
