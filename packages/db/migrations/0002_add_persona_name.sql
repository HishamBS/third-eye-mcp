-- Migration: Add name column to personas table
-- This allows explicit persona naming instead of deriving from eye field

ALTER TABLE personas ADD COLUMN name TEXT NOT NULL DEFAULT '';

-- Update existing personas with names derived from eye field
-- Capitalize first letter of eye name
UPDATE personas SET name = UPPER(SUBSTR(eye, 1, 1)) || SUBSTR(eye, 2) WHERE eye = 'overseer';
UPDATE personas SET name = 'Sharingan' WHERE eye = 'sharingan';
UPDATE personas SET name = 'Prompt Helper' WHERE eye = 'prompt-helper';
UPDATE personas SET name = 'Jōgan' WHERE eye = 'jogan';
UPDATE personas SET name = 'Rinnegan' WHERE eye = 'rinnegan';
UPDATE personas SET name = 'Mangekyō Sharingan' WHERE eye = 'mangekyo';
UPDATE personas SET name = 'Tenseigan' WHERE eye = 'tenseigan';
UPDATE personas SET name = 'Byakugan' WHERE eye = 'byakugan';
