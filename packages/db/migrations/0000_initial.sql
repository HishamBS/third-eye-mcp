CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`label` text NOT NULL,
	`encrypted_key` blob NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `models_cache` (
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`display_name` text,
	`family` text,
	`capability_json` text,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eyes_routing` (
	`eye` text PRIMARY KEY NOT NULL,
	`primary_provider` text,
	`primary_model` text,
	`fallback_provider` text,
	`fallback_model` text
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`eye` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`eye`, `version`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`status` text NOT NULL,
	`config_json` text
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`eye` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_md` text NOT NULL,
	`output_json` text,
	`tokens_in` integer,
	`tokens_out` integer,
	`latency_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_cache_provider_model_unique` ON `models_cache` (`provider`,`model`);
--> statement-breakpoint
CREATE UNIQUE INDEX `personas_eye_version_unique` ON `personas` (`eye`,`version`);
--> statement-breakpoint
CREATE INDEX `runs_session_id_idx` ON `runs` (`session_id`);
--> statement-breakpoint
CREATE INDEX `runs_created_at_idx` ON `runs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `personas_eye_active_idx` ON `personas` (`eye`,`active`);