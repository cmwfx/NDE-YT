# NDE YouTube Video Automation Platform

A full-stack platform for automating the creation of Near Death Experience (NDE) YouTube videos with AI-powered script generation, automated captions, and MrBeast-style video editing.

## Features

- **Multi-language Support**: Create videos in different languages with separate AI configurations
- **AI-Powered Idea Generation**: Generate unique video ideas using OpenRouter (Claude, GPT, etc.)
- **Automated Script Writing**: Generate 3000-word scripts tailored to your ideas
- **Word-Level Captions**: AssemblyAI integration for precise word-by-word captions
- **Stock Footage Integration**: Automatic visual scene generation with Pexels API
- **MrBeast-Style Editing**: FFmpeg-powered video rendering with centered captions
- **Resume Capability**: Save progress at each step and resume later
- **User Authentication**: Secure login with Supabase Auth

## Tech Stack

### Frontend

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- React Router
- Axios
- Supabase Client

### Backend

- Node.js + Express + TypeScript
- Supabase (PostgreSQL + Auth)
- FFmpeg for video processing
- OpenRouter API
- AssemblyAI API
- Pexels API

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- FFmpeg installed on your system
- Supabase account
- API keys for: OpenRouter, AssemblyAI, Pexels

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend, shared).

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. In your Supabase dashboard, go to the SQL Editor
3. Copy and paste the contents of `database/schema.sql` and run it to create all tables, indexes, and Row Level Security policies

### 3. Configure Environment Variables

Copy the template files and fill in your API keys:

**Backend:**

```bash
cp backend/env.template backend/.env
```

Then edit `backend/.env` with your actual values.

**Frontend:**

```bash
cp frontend/env.template frontend/.env
```

Then edit `frontend/.env` with your actual values.

### 4. Build Shared Types

```bash
cd shared
npm run build
cd ..
```

### 5. Run Development Servers

```bash
npm run dev
```

This will start both the frontend (port 3000) and backend (port 3001) concurrently.

## Usage

1. **Sign Up**: Create an account at http://localhost:3000/signup
2. **Configure Languages**: Go to Settings and add your language profiles with AI model configurations
3. **Create Project**: Start a new video project from the Dashboard
4. **Follow the Workflow**:
   - Step 1: Generate and approve video ideas
   - Step 2: Generate or write a script
   - Step 3: Upload audio narration
   - Step 4: Generate word-level captions
   - Step 5: Select visual footage for each scene
   - Step 6: Render the final video with captions

## Deployment

### Backend

```bash
cd backend
npm run build
npm start
```

Use PM2 for process management:

```bash
pm2 start dist/index.js --name nde-backend
```

### Frontend

```bash
cd frontend
npm run build
```

Serve the `dist` folder with Nginx or any static file server.

### Production Checklist

- Install FFmpeg on production server
- Set up Nginx reverse proxy
- Configure SSL certificate
- Create upload directories with proper permissions
- Set production environment variables
- Run `database/schema.sql` on production Supabase instance

## Deployment

📦 **See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete VPS deployment instructions.**

The deployment guide includes:
- Ubuntu VPS setup (works alongside existing sites)
- Nginx configuration with SSL certificates
- PM2 process management
- FFmpeg installation and setup
- Multiple domain/site configuration
- Production environment variables
- Monitoring, backups, and troubleshooting

## License

MIT
