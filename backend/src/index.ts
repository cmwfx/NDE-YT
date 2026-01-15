import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
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
import path from 'path';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size
    useTempFiles: true,
    tempFileDir: path.join(config.uploadDir, 'tmp'),
    createParentPath: true,
    debug: config.nodeEnv === 'development',
  })
);

// Ensure upload directories exist
const uploadDirs = [
  config.uploadDir,
  path.join(config.uploadDir, 'tmp'),
  path.join(config.uploadDir, 'audio'),
  path.join(config.uploadDir, 'visuals'),
  path.join(config.uploadDir, 'final'),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log(`Upload directory: ${config.uploadDir}`);

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
