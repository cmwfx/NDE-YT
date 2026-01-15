import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import type { LanguageConfig } from 'shared';

const router = Router();

// Get all language configs for user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('language_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Get language configs error:', error);
    res.status(500).json({ error: 'Failed to get language configs' });
  }
});

// Create language config
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      language_code,
      language_name,
      idea_model,
      idea_system_prompt,
      script_model,
      script_system_prompt,
      visual_model,
      visual_system_prompt,
    } = req.body;

    const { data, error } = await supabase
      .from('language_configs')
      .insert({
        user_id: userId,
        language_code,
        language_name,
        idea_model,
        idea_system_prompt,
        script_model,
        script_system_prompt,
        visual_model,
        visual_system_prompt,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Create language config error:', error);
    res.status(500).json({ error: 'Failed to create language config' });
  }
});

// Update language config
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const {
      language_code,
      language_name,
      idea_model,
      idea_system_prompt,
      script_model,
      script_system_prompt,
      visual_model,
      visual_system_prompt,
    } = req.body;

    const { data, error } = await supabase
      .from('language_configs')
      .update({
        language_code,
        language_name,
        idea_model,
        idea_system_prompt,
        script_model,
        script_system_prompt,
        visual_model,
        visual_system_prompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Update language config error:', error);
    res.status(500).json({ error: 'Failed to update language config' });
  }
});

// Delete language config
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const { error } = await supabase
      .from('language_configs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete language config error:', error);
    res.status(500).json({ error: 'Failed to delete language config' });
  }
});

export default router;
