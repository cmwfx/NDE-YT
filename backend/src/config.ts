import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },
  assemblyai: {
    apiKey: process.env.ASSEMBLYAI_API_KEY || '',
  },
  pexels: {
    apiKey: process.env.PEXELS_API_KEY || '',
  },
  port: parseInt(process.env.PORT || '3001', 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
};
