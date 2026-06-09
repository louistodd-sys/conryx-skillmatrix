-- Add optional site field to users for multi-site organisations (Professional tier)
ALTER TABLE users ADD COLUMN IF NOT EXISTS site text;
