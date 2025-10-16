# AGENTS.md

## Project Overview
Next.js 15 app for bulk-adding magnet links to qBittorrent. Single-package project with TypeScript, React 19, TailwindCSS, and AI-powered TV show parsing.

## Dev Environment Tips
- Use `pnpm` as package manager (lockfile present)
- Run `pnpm dev` to start development server with Turbopack
- App runs on `http://localhost:3000`
- Environment variables required - copy `.env.example` to `.env` and configure
- Project uses App Router (Next.js 15) - all routes in `app/` directory
- TypeScript strict mode enabled - fix type errors before committing
- Uses Valtio for state management - check `app/stores/` for global state
- AI features require GROQ_API_KEY for TV show name parsing

## Required Environment Variables
```bash
APP_PASSWORD=your_app_password_here
QBITTORRENT_URL=http://localhost:8080
QBITTORRENT_USERNAME=your_username
QBITTORRENT_PASSWORD=your_password
GROQ_API_KEY=your_groq_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

## Project Structure
- `app/` - Next.js App Router pages and components
- `app/api/` - API routes (auth, qBittorrent integration, AI parsing)
- `app/components/` - React components
- `app/hooks/` - Custom React hooks
- `app/services/` - Business logic and external API calls
- `app/stores/` - Valtio state management
- `app/utils/` - Utility functions
- `middleware.ts` - Next.js middleware for auth

## Key Dependencies
- Next.js 15 with React 19
- TypeScript 5 with strict mode
- TailwindCSS 4 for styling
- Valtio for state management
- AI SDK with Groq for TV show parsing
- Upstash Redis for caching
- Zod for schema validation
- Lucide React for icons

## Development Commands
```bash
pnpm dev          # Start dev server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Testing Instructions
- **No test framework currently configured** - tests need to be added
- Run `pnpm lint` to check code quality
- TypeScript compiler acts as basic validation - run `pnpm build` to check types
- Manual testing required for qBittorrent integration
- Test AI parsing with various torrent filenames via `/api/parse-tv-shows`

## Code Quality
- ESLint configured via Next.js (`next lint`)
- TypeScript strict mode enforced
- Prettier not configured - consider adding
- No pre-commit hooks - consider adding husky

## API Routes
- `POST /api/auth/login` - Password authentication
- `GET /api/config` - Get qBittorrent URL config
- `POST /api/qbittorrent` - Add torrents to qBittorrent
- `POST /api/parse-tv-shows` - AI-powered TV show name parsing

## State Management
- `appStateStore.ts` - Main app state (magnet links, suggestions, save path)
- `configStore.ts` - qBittorrent configuration
- `settingsStore.ts` - User preferences with localStorage persistence

## Authentication
- Simple password-based auth via middleware
- Cookie-based session (7-day expiry)
- Protected routes exclude `/api`, static files, favicon

## External Integrations
- **qBittorrent WebUI** - Torrent management
- **Groq AI** - TV show name parsing from filenames
- **Upstash Redis** - Caching (optional)

## Common Issues
- Missing environment variables will cause 500 errors
- qBittorrent WebUI must be enabled and accessible
- CORS issues if qBittorrent URL incorrect
- AI parsing requires valid GROQ_API_KEY

## Deployment
- Configured for Vercel deployment
- Set environment variables in Vercel dashboard
- Ensure qBittorrent instance is accessible from deployment
