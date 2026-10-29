import type { TorrentProgress } from './contracts'

const downloadProgress = (torrent: Record<string, unknown>): number => {
  switch (torrent.state) {
    case 'uploading':
    case 'stalledUP':
    case 'pausedUP':
    case 'stoppedUP':
    case 'queuedUP':
    case 'forcedUP':
    case 'checkingUP':
      return 1
  }

  // qBittorrent's `progress` measures the checking pass while checking files.
  // These counters describe downloaded content, excluding unselected files.
  const size = Number(torrent.size ?? 0)
  const completed = Number(torrent.completed ?? 0)
  if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(completed)) return 0
  return Math.max(0, Math.min(1, completed / size))
}

export const toTorrentProgress = (torrent: Record<string, unknown>): TorrentProgress => ({
  hash: String(torrent.hash ?? ''),
  name: String(torrent.name ?? ''),
  progress: downloadProgress(torrent),
  state: String(torrent.state ?? 'unknown'),
  dlspeed: Number(torrent.dlspeed ?? 0),
  eta: Number(torrent.eta ?? 0),
  size: Number(torrent.size ?? 0),
  numSeeds: Number(torrent.num_seeds ?? 0),
  numPeers: Number(torrent.num_leechs ?? 0),
  addedOn: Number(torrent.added_on ?? 0),
})
