// Database types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface LanguageConfig {
  id: string;
  user_id: string;
  language_code: string;
  language_name: string;
  idea_model: string;
  idea_system_prompt: string;
  script_model: string;
  script_system_prompt: string;
  visual_model: string;
  visual_system_prompt: string;
  created_at: string;
  updated_at: string;
}

export type IdeaStatus = 'available' | 'in_use' | 'completed';

export interface ApprovedIdea {
  id: string;
  user_id: string;
  language_code: string;
  idea_text: string;
  status: IdeaStatus;
  project_id: string | null;
  created_at: string;
}

export type ProjectStatus = 'in_progress' | 'completed' | 'failed';

export interface VideoProject {
  id: string;
  user_id: string;
  language_code: string;
  title: string;
  current_step: number;
  status: ProjectStatus;
  idea_text: string | null;
  script_text: string | null;
  audio_file_path: string | null;
  captions_data: CaptionData[] | null;
  visuals_data: VisualSection[] | null;
  final_video_path: string | null;
  created_at: string;
  updated_at: string;
}

// API types
export interface WordCaption {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface CaptionData {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

export interface VisualSection {
  section_text: string;
  search_query: string;
  start_time: number;
  end_time: number;
  duration: number;
  selected_pexels_video: {
    url: string;
    id: number;
    width: number;
    height: number;
  } | null;
  pexels_results?: PexelsVideo[];
}

export interface CaptionChunk {
  words: string[];
  start: number;
  end: number;
  text: string;
  captions: CaptionData[];
}

// Request/Response types
export interface GenerateIdeasRequest {
  userId: string;
  languageCode: string;
  count: number;
  systemPrompt: string;
  model: string;
}

export interface GenerateIdeasResponse {
  ideas: string[];
}

export interface GenerateScriptRequest {
  projectId: string;
  idea: string;
  systemPrompt: string;
  model: string;
}

export interface GenerateScriptResponse {
  script: string;
}

export interface GenerateCaptionsResponse {
  captions: CaptionData[];
}

export interface GenerateVisualsRequest {
  projectId: string;
}

export interface GenerateVisualsResponse {
  sections: VisualSection[];
}

export interface RenderVideoRequest {
  projectId: string;
}

export interface RenderVideoResponse {
  videoPath: string;
  downloadUrl: string;
}

// OpenRouter types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}
