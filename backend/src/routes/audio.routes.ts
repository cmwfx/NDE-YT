import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabase } from '../db.js';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const router = Router();

// Upload audio file
router.post('/upload/:projectId', authMiddleware, fileUpload(), async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
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

    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFile = Array.isArray(req.files.audio) ? req.files.audio[0] : req.files.audio;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
    if (!allowedTypes.includes(audioFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only MP3, WAV, and M4A are allowed.' });
    }

    // Create upload directory
    const uploadDir = path.join(config.uploadDir, 'audio', projectId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const fileName = `audio${path.extname(audioFile.name)}`;
    const filePath = path.join(uploadDir, fileName);
    await audioFile.mv(filePath);

    // Update project
    const { data, error } = await supabase
      .from('video_projects')
      .update({
        audio_file_path: filePath,
        current_step: 3,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    res.json({ filePath, project: data });
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

export default router;
