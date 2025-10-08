CREATE TABLE `duels` (
	`id` text PRIMARY KEY NOT NULL,
	`eye_name` text NOT NULL,
	`model_a` text NOT NULL,
	`model_b` text NOT NULL,
	`input` text NOT NULL,
	`iterations` integer NOT NULL,
	`results` text,
	`winner` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `eye_leaderboard` (
	`eye` text PRIMARY KEY NOT NULL,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`approval_rate` integer DEFAULT 0 NOT NULL,
	`avg_latency` integer DEFAULT 0 NOT NULL,
	`trend_data` text,
	`last_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mcp_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`description` text,
	`status` text DEFAULT 'official' NOT NULL,
	`platforms` text NOT NULL,
	`config_type` text NOT NULL,
	`config_files` text NOT NULL,
	`config_template` text NOT NULL,
	`setup_steps` text NOT NULL,
	`docs_url` text,
	`enabled` integer DEFAULT true,
	`display_order` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mcp_integrations_slug_unique` ON `mcp_integrations` (`slug`);--> statement-breakpoint
CREATE TABLE `persona_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`system_prompt` text NOT NULL,
	`settings` text,
	`created_at` integer NOT NULL,
	`created_by` text,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_personas` (
	`id` text PRIMARY KEY NOT NULL,
	`eye` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_personas`("id", "eye", "version", "content", "active", "created_at") SELECT "id", "eye", "version", "content", "active", "created_at" FROM `personas`;--> statement-breakpoint
DROP TABLE `personas`;--> statement-breakpoint
ALTER TABLE `__new_personas` RENAME TO `personas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `personas_eye_version_unique` ON `personas` (`eye`,`version`);