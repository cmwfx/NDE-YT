import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import { OpenRouterService } from '../services/openrouter.service.js';

const router = Router();
const openRouterService = new OpenRouterService();

// Generate script
router.post('/generate/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { idea, systemPrompt, model } = req.body;
    const userId = req.user!.id;

    // Verify project ownership
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate script
    const script = await openRouterService.generateScript(systemPrompt, model, idea);

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        idea_text: idea,
        script_text: script,
        current_step: 2,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ script, project: data });
  } catch (error) {
    console.error('Generate script error:', error);
    res.status(500).json({ error: 'Failed to generate script' });
  }
});

export default router;
