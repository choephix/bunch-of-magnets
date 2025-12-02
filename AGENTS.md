# AGENTS.md

## Overview

**Bunch of Magnets** - bulk add magnet links to torrent clients (qBittorrent, Transmission planned). Paste links/URLs, extract magnets, add all at once.

### Core Features

- Bulk torrent additions (10-100+ at once)
- Smart extraction from URLs, HTML, JSON, forum posts
- AI-powered TV show name parsing for folder organization
- Multi-downloader support (select from configured clients)
- Query history persistence (Upstash Redis)
- Password-protected access (7-day sessions)

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **State**: Valtio
- **Styling**: TailwindCSS 4 + Lucide icons
- **AI**: AI SDK with Groq, Cerebras, OpenAI providers
- **Cache**: Upstash Redis (history, AI results)
- **Validation**: Zod

## Project Structure

```
app/
├── api/
│   ├── auth/login       # Password auth
│   ├── config           # Public downloader list
│   ├── extract-magnets  # URL scraping for magnets
│   ├── parse-tv-shows   # AI show name parsing
│   ├── qbittorrent      # Add torrents to client
│   └── query-history    # Persist search history
├── components/
│   ├── HistoryModal.tsx
│   ├── MagnetExtractionLoader.tsx
│   ├── MagnetLinks.tsx
│   ├── NavButtons.tsx
│   ├── QbittorrentLink.tsx
│   ├── SaveDir.tsx
│   ├── SettingsModal.tsx
│   ├── StatusMessage.tsx
│   └── SuggestionPills.tsx
├── lib/
│   └── appConfig.ts     # Multi-downloader config loader
├── services/            # API clients
├── stores/
│   ├── appStateStore.ts    # Magnets, suggestions, save path
│   ├── configStore.ts      # Downloader list
│   ├── queryHistoryStore.ts # Search history (Redis-backed)
│   └── settingsStore.ts    # User prefs (localStorage)
└── utils/
middleware.ts            # Auth middleware
```

## Configuration

### Environment Variables

```bash
APP_PASSWORD=your_app_password
APP_CONFIG_BASE64=<base64 encoded .app.config.json>
GROQ_API_KEY=your_groq_key
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Downloader Config (`.app.config.json`)

```json
{
  "downloaders": [
    {
      "name": "my-qbit",
      "url": "https://...",
      "username": "...",
      "password": "...",
      "type": "qbittorrent"
    },
    {
      "name": "my-transmission",
      "url": "https://...",
      "username": "...",
      "password": "...",
      "type": "transmission"
    }
  ]
}
```

Base64 encode this file and set as `APP_CONFIG_BASE64`. Use `./update-env.sh` helper.

**Note**: Transmission support stubbed but not yet implemented (returns 501).

## Dev Commands

```bash
pnpm dev      # Turbopack dev server on :3000
pnpm build    # Production build + type check
pnpm lint     # ESLint
```

## Key Flows

### Magnet Extraction

1. User pastes URL or text
2. `extract-magnets` API fetches URL, parses HTML/JSON
3. Follows torrent page links for deeper extraction
4. Deduplicates and returns magnet links

### TV Show Parsing

1. Magnet links added to state
2. `parse-tv-shows` API uses AI to extract show name
3. Season numbers parsed via regex
4. Suggestions appear as clickable pills → update save path

### Adding Torrents

1. User configures save path via suggestions
2. Selects target downloader (settings)
3. `qbittorrent` API authenticates and batch-adds all magnets

## Notes

- No test framework configured
- TypeScript strict mode enforced
- Console logs use emoji prefixes for parsing
- Prefer named imports, functional/declarative style
