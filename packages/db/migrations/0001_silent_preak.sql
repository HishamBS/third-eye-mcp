CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `eyes_custom` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`description` text NOT NULL,
	`input_schema_json` text NOT NULL,
	`output_schema_json` text NOT NULL,
	`persona_id` text,
	`default_routing` text,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
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
CREATE TABLE `models_cache` (
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`display_name` text,
	`family` text,
	`capability_json` text,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`eye` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pipeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`eye` text,
	`type` text NOT NULL,
	`code` text,
	`md` text,
	`data_json` text,
	`next_action` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`pipeline_id` text NOT NULL,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`current_step` integer DEFAULT 0 NOT NULL,
	`state_json` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`description` text NOT NULL,
	`workflow_json` text NOT NULL,
	`category` text DEFAULT 'custom' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`content` text NOT NULL,
	`variables_json` text,
	`category` text NOT NULL,
	`tags` text,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
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
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`status` text NOT NULL,
	`config_json` text
);
--> statement-breakpoint
CREATE TABLE `strictness_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`ambiguity_threshold` integer DEFAULT 30 NOT NULL,
	`citation_cutoff` integer DEFAULT 70 NOT NULL,
	`consistency_tolerance` integer DEFAULT 80 NOT NULL,
	`mangekyo_strictness` text DEFAULT 'standard' NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eyes_custom_name_version_unique` ON `eyes_custom` (`name`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `models_cache_provider_model_unique` ON `models_cache` (`provider`,`model`);--> statement-breakpoint
CREATE UNIQUE INDEX `personas_eye_version_unique` ON `personas` (`eye`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `pipelines_name_version_unique` ON `pipelines` (`name`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `prompts_name_version_unique` ON `prompts` (`name`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `strictness_profiles_name_unique` ON `strictness_profiles` (`name`);