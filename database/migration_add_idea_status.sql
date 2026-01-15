-- Migration: Add status tracking to approved_ideas table
-- Run this if you already have the database set up
-- This adds idea status management to prevent reusing ideas

-- Add new columns to approved_ideas table
ALTER TABLE approved_ideas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

ALTER TABLE approved_ideas 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES video_projects(id) ON DELETE SET NULL;

-- Set all existing ideas to 'available' status
UPDATE approved_ideas 
SET status = 'available' 
WHERE status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_approved_ideas_status ON approved_ideas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_approved_ideas_project ON approved_ideas(project_id);

-- Add constraint to ensure valid status values (with conditional check)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_idea_status'
  ) THEN
    ALTER TABLE approved_ideas 
    ADD CONSTRAINT check_idea_status 
    CHECK (status IN ('available', 'in_use', 'completed'));
  END IF;
END $$;
