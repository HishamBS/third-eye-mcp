-- Add slug column to eyes table for SSOT canonical identification
-- Slug is the primary identifier used in code/prompts/API (e.g., 'overseer', 'sharingan')
ALTER TABLE `eyes` ADD COLUMN `slug` text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX `eyes_slug_unique` ON `eyes` (`slug`);
