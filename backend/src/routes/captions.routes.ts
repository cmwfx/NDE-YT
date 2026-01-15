import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import { AssemblyAIService } from '../services/assemblyai.service.js';

const router = Router();
const assemblyAIService = new AssemblyAIService();

// Generate captions
router.post('/generate/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    // Verify project ownership and get audio path
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.audio_file_path) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Generate captions
    const captions = await assemblyAIService.generateCaptions(project.audio_file_path);

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        captions_data: captions,
        current_step: 4,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ captions, project: data });
  } catch (error) {
    console.error('Generate captions error:', error);
    res.status(500).json({ error: 'Failed to generate captions' });
  }
});

export default router;
