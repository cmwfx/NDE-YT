import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import { OpenRouterService } from '../services/openrouter.service.js';
import { PexelsService } from '../services/pexels.service.js';
import path from 'path';
import { config } from '../config.js';
import type { VisualSection } from 'shared';

const router = Router();
const openRouterService = new OpenRouterService();
const pexelsService = new PexelsService();

// Generate visual sections
router.post('/generate-sections/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Verify project and get data
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.script_text || !project.captions_data) {
      return res.status(400).json({ error: 'Script and captions must be generated first' });
    }

    // Get language config for visual model
    const { data: langConfig } = await supabase
      .from('language_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('language_code', project.language_code)
      .single();

    if (!langConfig) {
      return res.status(400).json({ error: 'Language config not found' });
    }

    // Generate sections using AI
    const sections = await openRouterService.generateVisualSections(
      langConfig.visual_system_prompt,
      langConfig.visual_model,
      project.script_text,
      project.captions_data
    );

    // Search Pexels for each section
    const sectionsWithResults: VisualSection[] = await Promise.all(
      sections.map(async (section) => {
        const videos = await pexelsService.searchVideos(section.search_query, 3);
        return {
          ...section,
          duration: section.end_time - section.start_time,
          selected_pexels_video: null,
          pexels_results: videos,
        };
      })
    );

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        visuals_data: sectionsWithResults,
        current_step: 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ sections: sectionsWithResults, project: data });
  } catch (error) {
    console.error('Generate visual sections error:', error);
    res.status(500).json({ error: 'Failed to generate visual sections' });
  }
});

// Update visual selection
router.put('/select-video/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { sectionIndex, videoId } = req.body;
    const userId = req.user!.id;

    // Get project
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project || !project.visuals_data) {
      return res.status(404).json({ error: 'Project or visuals not found' });
    }

    const visuals = project.visuals_data as VisualSection[];
    const section = visuals[sectionIndex];

    if (!section || !section.pexels_results) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    // Find selected video
    const selectedVideo = section.pexels_results.find((v) => v.id === videoId);

    if (!selectedVideo) {
      return res.status(400).json({ error: 'Video not found' });
    }

    // Download video
    const videoUrl = pexelsService.getBestVideoQuality(selectedVideo);
    const downloadPath = path.join(config.uploadDir, 'visuals', projectId, `${videoId}.mp4`);
    await pexelsService.downloadVideo(videoUrl, downloadPath);

    // Update section
    visuals[sectionIndex].selected_pexels_video = {
      url: videoUrl,
      id: selectedVideo.id,
      width: selectedVideo.width,
      height: selectedVideo.height,
    };

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        visuals_data: visuals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ project: data });
  } catch (error) {
    console.error('Select video error:', error);
    res.status(500).json({ error: 'Failed to select video' });
  }
});

// Re-search for a section
router.post('/re-search/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { sectionIndex, newQuery } = req.body;
    const userId = req.user!.id;

    // Get project
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project || !project.visuals_data) {
      return res.status(404).json({ error: 'Project or visuals not found' });
    }

    const visuals = project.visuals_data as VisualSection[];

    // Search with new query
    const videos = await pexelsService.searchVideos(newQuery, 3);

    // Update section
    visuals[sectionIndex].search_query = newQuery;
    visuals[sectionIndex].pexels_results = videos;

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        visuals_data: visuals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ project: data });
  } catch (error) {
    console.error('Re-search error:', error);
    res.status(500).json({ error: 'Failed to re-search' });
  }
});

export default router;
