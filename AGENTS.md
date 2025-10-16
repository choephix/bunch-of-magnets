# AGENTS.md

## Project Overview
**Bunch of Magnets** is a web application that streamlines the process of adding multiple torrent magnet links to qBittorrent at once. Instead of manually adding torrents one by one through qBittorrent's web interface, users can paste dozens of magnet links or URLs containing magnet links and add them all simultaneously.

### Core Purpose
- **Bulk torrent management** - Add 10, 50, or 100+ torrents in seconds instead of minutes
- **Smart extraction** - Automatically finds magnet links embedded in web pages, forum posts, or text
- **Intelligent organization** - AI-powered parsing of TV show names for proper folder structure
- **Remote control** - Manage qBittorrent from any device with a web browser
- **Password protection** - Secure access to prevent unauthorized torrent additions

### Target Users
- **Media collectors** who download entire TV series or movie collections
- **Content archivists** managing large libraries of educational or historical content
- **Power users** who frequently batch-download from private trackers or RSS feeds
- **Remote users** who want to queue downloads while away from their main computer
- **Anyone frustrated** with qBittorrent's one-at-a-time web interface limitations

## User Interface & Experience

### Login Flow
- Clean, minimal login page with password field
- Dark theme by default (respects system preference)
- Single password protects entire application
- 7-day session persistence - login once per week

### Main Interface Layout
- **Header**: App title, settings gear icon, qBittorrent link button
- **Input Area**: Large textarea for pasting magnet links or URLs
- **Smart Suggestions**: Dynamic pills showing detected TV show names, seasons, library categories
- **Save Directory**: Editable path field with intelligent defaults
- **Action Buttons**: Extract Links, Add Torrents, Clear All
- **Status Messages**: Real-time feedback on operations and errors

### Visual Design
- **Dark theme** with subtle gradients and modern typography
- **Responsive layout** works on desktop, tablet, and mobile
- **Lucide icons** for consistent, clean iconography
- **TailwindCSS** for polished, professional appearance
- **Smooth animations** for state transitions and loading states
- **Color-coded feedback** - green for success, red for errors, blue for info

## User Flow & Features

### Typical User Journey
1. **Access** - Navigate to app URL, enter password if not logged in
2. **Paste Content** - Drop magnet links, URLs, or mixed text into main textarea
3. **Extract** - Click "Extract Links" to automatically find all magnet links
4. **Review** - See parsed magnet links with torrent names and file sizes
5. **Customize** - Adjust save directory, select suggested tags/categories
6. **Submit** - Click "Add Torrents" to send everything to qBittorrent
7. **Confirm** - Receive success message and optional link to qBittorrent web UI

### Smart Link Extraction
- **Direct magnet links** - `magnet:?xt=urn:btih:...` copied from trackers
- **Forum posts** - Extracts magnets from BBCode, HTML, or plain text
- **Tracker pages** - Finds magnet links embedded in download pages
- **RSS feeds** - Parses magnet links from feed content
- **Mixed content** - Handles text with magnets scattered among other content
- **Duplicate detection** - Automatically removes duplicate magnet links

### AI-Powered TV Show Detection
- **Filename parsing** - Analyzes torrent names to extract show titles
- **Season detection** - Identifies season numbers and episode ranges
- **Name standardization** - Converts "The.Mandalorian.S03E01" to "The Mandalorian"
- **Library categorization** - Suggests appropriate folders (Series, Movies, Documentaries)
- **Smart suggestions** - Offers one-click tags based on detected content type

### Save Directory Intelligence
- **Default structure** - `/storage/Library/_/` as starting point
- **Dynamic suggestions** - Updates path based on detected show names
- **Season organization** - Automatically appends season folders when detected
- **Custom paths** - Full manual control over destination directories
- **Path validation** - Prevents invalid characters and ensures proper formatting

### Settings & Customization
- **Library preferences** - Enable/disable suggestions for different content types
- **Default categories** - Set preferred tags for Live Action, Anime, Documentaries
- **Path templates** - Customize how show names map to folder structures
- **Extraction behavior** - Configure how aggressive link detection should be
- **UI preferences** - Theme settings and interface customizations

### Error Handling & Feedback
- **Connection issues** - Clear messages when qBittorrent is unreachable
- **Authentication errors** - Helpful guidance for qBittorrent login problems
- **Invalid magnets** - Highlights problematic links with specific error details
- **Partial failures** - Shows which torrents succeeded/failed in batch operations
- **Network timeouts** - Graceful handling of slow or interrupted connections

### Mobile Experience
- **Touch-friendly** - Large tap targets and swipe gestures
- **Responsive design** - Adapts to phone and tablet screen sizes
- **Paste optimization** - Easy sharing from other apps via system clipboard
- **Offline awareness** - Clear indication when network is unavailable
- **Performance** - Optimized for slower mobile connections

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

## Technical Implementation Details

### Architecture Overview
- **Frontend**: React 19 with Next.js 15 App Router for modern, fast UI
- **Backend**: Next.js API routes handling authentication and qBittorrent communication
- **State Management**: Valtio for reactive, simple state without Redux complexity
- **Styling**: TailwindCSS 4 for rapid, consistent design development
- **AI Integration**: Groq API with Llama models for intelligent content parsing
- **Caching**: Upstash Redis for performance optimization and rate limiting

### Performance Optimizations
- **Turbopack** - Fast development builds and hot reloading
- **Client-Side State** - Reduces server round trips for UI interactions
- **Batch Operations** - Single API call handles multiple torrent additions
- **Lazy Loading** - Components load only when needed
- **Caching Strategy** - Redis caches AI parsing results to avoid redundant API calls

## External Integrations
- **qBittorrent WebUI** - Direct API communication for torrent management
- **Groq AI** - Advanced language models for TV show name parsing from filenames
- **Upstash Redis** - Serverless Redis for caching and session management

## Future Enhancement Ideas

### Advanced Features
- **User accounts** - Individual preferences and download history
- **Progress tracking** - Real-time download progress and completion notifications
- **Statistics dashboard** - Usage analytics and download history

### Integration Expansions
- **Multiple qBittorrent instances** - Manage torrents across different servers
- **Other torrent clients** - Support for Transmission, Deluge, etc.
- **Cloud storage** - Direct integration with Google Drive, Dropbox
- **Media servers** - Automatic library updates for Plex, Jellyfin
- **Notification services** - Discord, Slack, email alerts for completed downloads

### AI & Automation
- **Content recommendations** - Suggest related torrents based on download history
- **Quality preferences** - Automatically select best quality versions
- **Release monitoring** - Watch for new episodes/seasons of tracked shows
- **Duplicate detection** - Prevent downloading same content multiple times
- **Smart categorization** - Advanced content type detection and organization

## Performance Notes
- **Turbopack development** - Significantly faster builds and hot reloading
- **Client-side state** - Valtio provides reactive state without Redux overhead
- **AI parsing latency** - Groq API calls may take 1-3 seconds, implement loading states
- **Memory optimization** - Clear processed data to prevent browser memory leaks
- **Network efficiency** - Batch API calls and implement request deduplication
