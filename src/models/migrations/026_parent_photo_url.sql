-- Add photo_url to parent table for profile photo uploads
ALTER TABLE parent ADD COLUMN IF NOT EXISTS photo_url TEXT;
