# AGENTS.md

## Overview

**Bunch of Magnets** - bulk add magnet links to torrent clients (qBittorrent, Transmission planned). Paste links/URLs, extract magnets, add all at once.

### Core Features

- Bulk torrent additions (10-100+ at once)
- Smart extraction from URLs, HTML, JSON, forum posts
- AI-powered TV show name parsing for folder organization
- Multi-downloader support (select from configured clients)
- Query history persistence (browser localStorage)
- Password-protected access (signed 7-day sessions)

## Tech Stack

- **Cache**: Browser localStorage (settings, query history)
- **State**: Valtio
- **Styling**: TailwindCSS 4 + Lucide icons
- **AI**: AI SDK with Groq
- **Validation**: Zod

## Project Structure

```
app/
├── api/
│   ├── auth/login       # Password auth
│   ├── config           # Public downloader list
│   ├── extract-magnets  # URL scraping for magnets
│   ├── parse-tv-shows   # AI show name parsing
│   └── qbittorrent      # Add torrents / progress
├── components/
├── lib/
│   ├── appConfig.ts     # Multi-downloader config loader
│   ├── contracts.ts     # Shared public wire schemas
│   ├── downloader.ts    # Protocol dispatch (qBittorrent)
│   ├── session.ts       # Signed auth cookie
│   └── ssrf.ts          # Outbound URL allowlisting
├── services/            # Browser API clients
├── stores/
│   ├── appStateStore.ts    # Magnets, suggestions, save path
│   ├── configStore.ts      # Downloader list
│   ├── queryHistoryStore.ts # Search history (localStorage)
│   └── settingsStore.ts    # User prefs (localStorage)
└── utils/
middleware.ts            # Auth for pages and API
```

## Configuration

### Environment Variables

```bash
APP_PASSWORD=your_app_password
APP_CONFIG_BASE64=<base64 encoded .app.config.json>
GROQ_API_KEY=your_groq_key
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
      "type": "qbittorrent",
      "basePath": "/downloads/",
      "librarySuggestions": { "movies": true, "tv": true }
    },
    {
      "name": "my-transmission",
      "url": "https://...",
      "username": "...",
      "password": "...",
      "type": "transmission",
      "basePath": "/downloads/",
      "librarySuggestions": { "movies": true, "tv": true }
    }
  ]
}
```

Base64 encode this file and set as `APP_CONFIG_BASE64`. Use `./scripts/update-env.sh` helper.

**Note**: Transmission support stubbed but not yet implemented (returns 501).

## Dev Commands

```bash
pnpm dev      # Turbopack dev server on :3000
pnpm build    # Production build + type check
pnpm test     # node:test unit tests (app/**/*.test.ts)
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

1. User configures save path via suggestions or types a complete destination
2. Selects target downloader (settings)
3. Add accepts a nonempty manual destination without unresolved `_` path segments,
   or a suggestion-built path with a selected show/movie name
   (`canAddTorrents` in `app/utils/savePath.ts`). Suggestion clicks resume smart
   path building; downloader changes discard manual destinations.
4. `qbittorrent` API authenticates and batch-adds all magnets

## Notes

- Unit tests run on node:test (`pnpm test`), no test framework dependency
- TypeScript strict mode enforced
- Console logs use emoji prefixes for parsing
- Prefer named imports, functional/declarative style
