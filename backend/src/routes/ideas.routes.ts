import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import { OpenRouterService } from '../services/openrouter.service.js';
import type { GenerateIdeasRequest, ApprovedIdea } from 'shared';

const router = Router();
const openRouterService = new OpenRouterService();

// Generate ideas
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { languageCode, count, systemPrompt, model } = req.body;
    const userId = req.user!.id;

    // Fetch previous approved ideas for this language
    const { data: previousIdeas } = await supabase
      .from('approved_ideas')
      .select('idea_text')
      .eq('user_id', userId)
      .eq('language_code', languageCode);

    const previousIdeaTexts = previousIdeas?.map((idea) => idea.idea_text) || [];

    // Generate new ideas
    const ideas = await openRouterService.generateIdeas(
      systemPrompt,
      model,
      count,
      previousIdeaTexts
    );

    res.json({ ideas });
  } catch (error) {
    console.error('Generate ideas error:', error);
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

// Approve idea
router.post('/approve', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { languageCode, ideaText } = req.body;
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('approved_ideas')
      .insert({
        user_id: userId,
        language_code: languageCode,
        idea_text: ideaText,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Approve idea error:', error);
    res.status(500).json({ error: 'Failed to approve idea' });
  }
});

// Get approved ideas
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { languageCode } = req.query;
    const userId = req.user!.id;

    let query = supabase
      .from('approved_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (languageCode) {
      query = query.eq('language_code', languageCode);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get approved ideas error:', error);
    res.status(500).json({ error: 'Failed to get approved ideas' });
  }
});

// Delete approved idea
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { error } = await supabase
      .from('approved_ideas')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete idea error:', error);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

export default router;
