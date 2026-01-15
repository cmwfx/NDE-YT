import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import ideasRoutes from './routes/ideas.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import scriptsRoutes from './routes/scripts.routes.js';
import audioRoutes from './routes/audio.routes.js';
import captionsRoutes from './routes/captions.routes.js';
import visualsRoutes from './routes/visuals.routes.js';
import videosRoutes from './routes/videos.routes.js';
import fs from 'fs';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directories exist
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Routes
app.use('/api/ideas', ideasRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/captions', captionsRoutes);
app.use('/api/visuals', visualsRoutes);
app.use('/api/videos', videosRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
