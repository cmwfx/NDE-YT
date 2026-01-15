import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import { FFmpegService } from '../services/ffmpeg.service.js';
import fs from 'fs';
import type { VisualSection, CaptionData } from 'shared';

const router = Router();
const ffmpegService = new FFmpegService();

// Render video
router.post('/render/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Get project
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.audio_file_path || !project.captions_data || !project.visuals_data) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    // Verify all visuals are selected
    const visuals = project.visuals_data as VisualSection[];
    const allSelected = visuals.every((v) => v.selected_pexels_video !== null);

    if (!allSelected) {
      return res.status(400).json({ error: 'Please select videos for all sections' });
    }

    // Render video
    const videoPath = await ffmpegService.renderFinalVideo(
      projectId,
      visuals,
      project.audio_file_path,
      project.captions_data as CaptionData[]
    );

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        final_video_path: videoPath,
        current_step: 7,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    // Mark the idea as completed
    if (project.idea_text) {
      await supabase
        .from('approved_ideas')
        .update({
          status: 'completed',
        })
        .eq('project_id', projectId)
        .eq('user_id', userId);
    }

    res.json({
      videoPath,
      downloadUrl: `/api/videos/download/${projectId}`,
      project: data,
    });
  } catch (error) {
    console.error('Render video error:', error);
    
    // Update project status to failed
    await supabase
      .from('video_projects')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.projectId);

    res.status(500).json({ error: 'Failed to render video' });
  }
});

// Download video
router.get('/download/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Get project
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project || !project.final_video_path) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!fs.existsSync(project.final_video_path)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const fileName = `${project.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(project.final_video_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

export default router;
