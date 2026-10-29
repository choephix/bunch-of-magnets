# Bunch of Magnets

A web application for bulk-adding magnet links to torrent clients (qBittorrent, with Transmission planned).

Live at [bunch-of-magnets.vercel.app](https://bunch-of-magnets.vercel.app)

## Features

- Bulk-add many magnet links at once
- Smart extraction of magnets from arbitrary URLs (HTML pages, JSON endpoints, forum posts)
- Automatic tag detection from torrent display names
- AI-powered TV show name parsing for tidy folder organization
- Multi-downloader support (select between configured clients)
- Query history persisted in browser localStorage
- Password-protected access (signed httpOnly cookie, 7-day session)

## For Users

1. Visit [bunch-of-magnets.vercel.app](https://bunch-of-magnets.vercel.app)
2. Enter the provided password
3. Paste magnet links or URLs containing magnet links
4. Type a save directory to use it as-is, or pick suggestion pills to build a path
5. Click `Add Torrents` to send them to your downloader

Manually entered destinations (for example, `/media-library/kid-movies/`) do not
require a show/movie title. Clicking a suggestion resumes smart path building,
using the typed destination as its root; smart paths require a title. Empty paths
and unresolved `_` placeholders cannot be submitted. Changing downloaders replaces
a manual destination with the new downloader's base path.

Torrent bars show downloaded content, not the progress of a file-checking pass.
Finished torrents remain at 100% when seeding, stopped, or rechecking; metadata
fetching does not fill the download bar.

## For Developers

### Prerequisites

- Node.js 20.9+
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

### Environment Variables

See [.env.example](./.env.example) for the full list. Briefly:

- `APP_PASSWORD` - login password
- `APP_CONFIG_BASE64` - base64-encoded `.app.config.json`
- `GROQ_API_KEY` - for AI show-name parsing

### Development

```bash
pnpm dev      # turbopack on :3000
pnpm build    # production build (also runs type check)
```

### Tech Stack

- Next.js 16 (App Router) + React 19
- Valtio for state, TailwindCSS 4, Lucide icons
- AI SDK with Groq
- Zod for validation
- Vercel for deployment

## License

MIT
