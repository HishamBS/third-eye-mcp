-- Third Eye MCP - V1 Release Schema
-- Generated from: packages/db/schema.ts (SSOT for all field names)
-- Generator: drizzle-kit generate
-- Convention: camelCase in TypeScript → snake_case in SQL (Drizzle handles mapping)
-- DO NOT hand-edit this file - regenerate from schema using: drizzle-kit generate

CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_settings_key_unique` ON `app_settings` (`key`);--> statement-breakpoint
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
CREATE TABLE `duels` (
	`id` text PRIMARY KEY NOT NULL,
	`eye_id` text NOT NULL,
	`model_a` text NOT NULL,
	`model_b` text NOT NULL,
	`input` text NOT NULL,
	`iterations` integer NOT NULL,
	`results` text,
	`winner` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `execution_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`node_id` text NOT NULL,
	`node_type` text NOT NULL,
	`status` text NOT NULL,
	`verdict` text,
	`output_json` text,
	`error_message` text,
	`tokens_used` integer,
	`latency_ms` integer,
	`metadata_json` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`run_id`) REFERENCES `pipeline_queue`(`run_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `execution_steps_run_id_node_id_unique` ON `execution_steps` (`run_id`,`node_id`);--> statement-breakpoint
CREATE TABLE `eye_leaderboard` (
	`id` text PRIMARY KEY NOT NULL,
	`eye_id` text NOT NULL,
	`total_runs` integer DEFAULT 0 NOT NULL,
	`approval_rate` integer DEFAULT 0 NOT NULL,
	`avg_latency` integer DEFAULT 0 NOT NULL,
	`trend_data` text,
	`last_updated` integer NOT NULL,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eye_leaderboard_eye_id_unique` ON `eye_leaderboard` (`eye_id`);--> statement-breakpoint
CREATE TABLE `eyes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`description` text NOT NULL,
	`icon_svg` text,
	`input_schema_json` text NOT NULL,
	`output_schema_json` text NOT NULL,
	`persona_id` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eyes_name_version_unique` ON `eyes` (`name`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `eyes_name_unique` ON `eyes` (`name`);--> statement-breakpoint
CREATE TABLE `eyes_routing` (
	`id` text PRIMARY KEY NOT NULL,
	`eye_id` text NOT NULL,
	`primary_provider` text,
	`primary_model` text,
	`fallback_provider` text,
	`fallback_model` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eyes_routing_eye_id_unique` ON `eyes_routing` (`eye_id`);--> statement-breakpoint
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
CREATE TABLE `models_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`display_name` text,
	`family` text,
	`capability_json` text,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_cache_provider_model_unique` ON `models_cache` (`provider`,`model`);--> statement-breakpoint
CREATE TABLE `node_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`pipeline_id` text NOT NULL,
	`node_id` text NOT NULL,
	`eye_id` text,
	`provider_override` text,
	`strictness_override` text,
	`notes_md` text,
	`config_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `node_configs_pipeline_id_node_id_unique` ON `node_configs` (`pipeline_id`,`node_id`);--> statement-breakpoint
CREATE TABLE `persona_blueprints` (
	`id` text PRIMARY KEY NOT NULL,
	`eye_id` text NOT NULL,
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
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona_blueprints_eye_id_unique` ON `persona_blueprints` (`eye_id`);--> statement-breakpoint
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
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`eye_id` text NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`metadata_json` text NOT NULL,
	`mission` text NOT NULL,
	`guidance_json` text,
	`validation_json` text,
	`envelope_json` text NOT NULL,
	`reminders_json` text NOT NULL,
	`notes` text,
	`llm_config_json` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personas_eye_id_version_unique` ON `personas` (`eye_id`,`version`);--> statement-breakpoint
CREATE TABLE `pipeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`eye_id` text,
	`type` text NOT NULL,
	`code` text,
	`md` text,
	`data_json` text,
	`next_action` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipeline_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`pipeline_id` text NOT NULL,
	`session_id` text NOT NULL,
	`status` text NOT NULL,
	`input_json` text,
	`final_verdict` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_queue_run_id_unique` ON `pipeline_queue` (`run_id`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `pipelines_name_version_unique` ON `pipelines` (`name`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `pipelines_name_unique` ON `pipelines` (`name`);--> statement-breakpoint
CREATE TABLE `provider_failovers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`eye_id` text NOT NULL,
	`primary_provider` text NOT NULL,
	`primary_model` text NOT NULL,
	`failed_reason` text NOT NULL,
	`fallback_provider` text NOT NULL,
	`fallback_model` text NOT NULL,
	`fallback_success` integer NOT NULL,
	`error_details` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `provider_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`label` text NOT NULL,
	`encrypted_key` blob NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limit_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`eye_id` text,
	`window_start` integer NOT NULL,
	`request_count` integer NOT NULL,
	`tokens_consumed` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`eye_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_md` text NOT NULL,
	`output_json` text,
	`tokens_in` integer,
	`tokens_out` integer,
	`latency_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eye_id`) REFERENCES `eyes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_name` text,
	`model` text,
	`display_name` text,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_activity` integer,
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
CREATE UNIQUE INDEX `strictness_profiles_name_unique` ON `strictness_profiles` (`name`);