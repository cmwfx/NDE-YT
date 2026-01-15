-- NDE Video Generator Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Language configurations
CREATE TABLE language_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  idea_model TEXT NOT NULL,
  idea_system_prompt TEXT NOT NULL,
  script_model TEXT NOT NULL,
  script_system_prompt TEXT NOT NULL,
  visual_model TEXT NOT NULL,
  visual_system_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approved ideas
CREATE TABLE approved_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  idea_text TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- available, in_use, completed
  project_id UUID REFERENCES video_projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video projects
CREATE TABLE video_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress',
  idea_text TEXT,
  script_text TEXT,
  audio_file_path TEXT,
  captions_data JSONB,
  visuals_data JSONB,
  final_video_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_language_configs_user_id ON language_configs(user_id);
CREATE INDEX idx_approved_ideas_user_id ON approved_ideas(user_id);
CREATE INDEX idx_approved_ideas_language ON approved_ideas(user_id, language_code);
CREATE INDEX idx_video_projects_user_id ON video_projects(user_id);
CREATE INDEX idx_video_projects_status ON video_projects(user_id, status);

-- Enable Row Level Security
ALTER TABLE language_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

-- Policies for language_configs
CREATE POLICY "Users can view own configs" 
  ON language_configs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configs" 
  ON language_configs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configs" 
  ON language_configs FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configs" 
  ON language_configs FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for approved_ideas
CREATE POLICY "Users can view own ideas" 
  ON approved_ideas FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ideas" 
  ON approved_ideas FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ideas" 
  ON approved_ideas FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for video_projects
CREATE POLICY "Users can view own projects" 
  ON video_projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
  ON video_projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON video_projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON video_projects FOR DELETE 
  USING (auth.uid() = user_id);

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at column
CREATE TRIGGER update_language_configs_updated_at 
  BEFORE UPDATE ON language_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_projects_updated_at 
  BEFORE UPDATE ON video_projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
