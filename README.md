# Bunch of Magnets

A web application for bulk-adding magnet links to torrent clients (qBittorrent, with Transmission planned).

Live at [bunch-of-magnets.vercel.app](https://bunch-of-magnets.vercel.app)

## Features

- Bulk-add many magnet links at once
- Smart extraction of magnets from arbitrary URLs (HTML pages, JSON endpoints, forum posts)
- Automatic tag detection from torrent display names
- AI-powered TV show name parsing for tidy folder organization
- Multi-downloader support (select between configured clients)
- Query history persisted in Upstash Redis
- Password-protected access (httpOnly cookie, 7-day session)

## For Users

1. Visit [bunch-of-magnets.vercel.app](https://bunch-of-magnets.vercel.app)
2. Enter the provided password
3. Paste magnet links or URLs containing magnet links
4. Pick suggestion pills / configure save path if needed
5. Click `Add Torrents` to send them to your downloader

## For Developers

### Prerequisites

- Node.js 18.18+
- pnpm (preferred), npm or yarn
- A reachable qBittorrent instance with WebUI enabled

### Setup

1. Clone this repo
2. Install deps: `pnpm install`
3. Copy `.env.example` to `.env.local` and fill in values
4. Author a `.app.config.json` describing your downloader(s):

   ```json
   {
     "downloaders": [
       {
         "name": "my-qbit",
         "url": "https://qbit.example.com",
         "username": "admin",
         "password": "...",
         "type": "qbittorrent",
         "basePath": "/downloads/",
         "librarySuggestions": { "movies": true, "tv": true }
       }
     ]
   }
   ```

5. Encode it into `APP_CONFIG_BASE64` via `./scripts/update-env.sh`
6. (Optional) provision an Upstash Redis instance for history + AI caching

### Environment Variables

See [.env.example](./.env.example) for the full list. Briefly:

- `APP_PASSWORD` - login password
- `APP_CONFIG_BASE64` - base64-encoded `.app.config.json`
- `GROQ_API_KEY` - for AI show-name parsing
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - optional Redis storage

### Development

```bash
pnpm dev      # turbopack on :3000
pnpm build    # production build (also runs type check)
pnpm lint     # eslint
```

### Tech Stack

- Next.js 16 (App Router) + React 19
- Valtio for state, TailwindCSS 4, Lucide icons
- AI SDK (Groq / Cerebras / OpenAI)
- Upstash Redis
- Zod for validation
- Vercel for deployment

## License

MIT
