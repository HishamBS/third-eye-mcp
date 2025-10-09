-- Add eye_settings table for Eye display name overrides
CREATE TABLE IF NOT EXISTS `eye_settings` (
  `eye` text PRIMARY KEY NOT NULL,
  `display_name` text,
  `description` text,
  `updated_at` integer NOT NULL
);
