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
    
        // Update status to rendering
        await supabase
          .from('video_projects')
          .update({
            status: 'rendering',
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
    
        // Start rendering in background
        renderInBackground(projectId, userId, project, visuals).catch((err) => {
          console.error('Background render error:', err);
        });
    
        // Return immediately
        res.status(202).json({ message: 'Rendering started' });
      } catch (error) {
        console.error('Render video error:', error);
        res.status(500).json({ error: 'Failed to start rendering' });
      }
    });
    
    async function renderInBackground(
      projectId: string,
      userId: string,
      project: any,
      visuals: VisualSection[]
    ) {
      try {
        console.log(`Starting background render for project ${projectId}`);
        
        const videoPath = await ffmpegService.renderFinalVideo(
          projectId,
          visuals,
          project.audio_file_path,
          project.captions_data as CaptionData[]
        );
    
        // Update project
        const { error } = await supabase
          .from('video_projects')
          .update({
            final_video_path: videoPath,
            current_step: 7,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
    
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
        
        console.log(`Background render completed for project ${projectId}`);
      } catch (error) {
        console.error(`Background render failed for project ${projectId}:`, error);
    
        // Update project status to failed
        await supabase
          .from('video_projects')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
      }
    }

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
