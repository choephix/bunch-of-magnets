# Bunch of Magnets

A web application for bulk-adding magnet links to qBittorrent. Live at [bunch-of-magnets.vercel.app](https://bunch-of-magnets.vercel.app)

## Features

- Bulk add multiple magnet links at once
- Extract magnet links from URLs
- Automatic tag detection from torrent names
- Password-protected access
- Clean, dark-themed interface
- Built with Next.js and TypeScript

## For Users

1. Visit [bunch-of-magnets.vercel.app](https://bunch-of-magnets.vercel.app)
2. Enter the provided password
3. Paste magnet links or URLs containing magnet links
4. Configure save path if needed
5. Click "Add Torrents" to send them to qBittorrent

## For Developers

### Prerequisites

- Node.js 18.18.0 or later
- npm, yarn, or pnpm
- A qBittorrent instance with WebUI enabled

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your qBittorrent configuration:
   ```
   QBITTORRENT_URL=your-qbittorrent-webui-url
   QBITTORRENT_USERNAME=your-username
   QBITTORRENT_PASSWORD=your-password
   APP_PASSWORD=desired-login-password
   ```

### Development

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

### Technologies

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- Vercel for deployment

## License

MIT
