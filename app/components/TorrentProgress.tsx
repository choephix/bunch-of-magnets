'use client'

import { ChevronDown, ChevronUp, CircleCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { fetchTorrentProgress, TorrentProgress } from '../services/qbittorrentService'
import { configStore, getActiveDownloader } from '../stores/configStore'
import { settingsStore } from '../stores/settingsStore'

const POLL_INTERVAL_MS = 1500
const ERROR_POLL_INTERVAL_MS = 8000
const RECENT_LIMIT = 20
const MAX_EMPTY_POLLS = 20
/** qBittorrent reports this ETA when it has no estimate yet. */
const ETA_UNKNOWN = 8640000

const COMPLETE_STATES: Record<string, true> = {
  uploading: true,
  stalledUP: true,
  pausedUP: true,
  queuedUP: true,
  forcedUP: true,
  checkingUP: true,
}

const METADATA_STATES: Record<string, true> = {
  metaDL: true,
  downloadingMetadata: true,
}

const STATE_LABELS: Record<string, string> = {
  allocating: 'Allocating',
  checkingDL: 'Checking',
  checkingResumeData: 'Checking',
  checkingUP: 'Checking',
  downloading: 'Downloading',
  downloadingMetadata: 'Fetching metadata',
  error: 'Error',
  forcedDL: 'Downloading',
  forcedUP: 'Seeding',
  metaDL: 'Fetching metadata',
  missingFiles: 'Missing files',
  moving: 'Moving',
  pausedDL: 'Paused',
  pausedUP: 'Complete',
  queuedDL: 'Queued',
  queuedUP: 'Queued',
  stalledDL: 'Stalled',
  stalledUP: 'Seeding',
  unknown: 'Unknown',
  uploading: 'Seeding',
}

const humanizeState = (state: string): string => {
  if (STATE_LABELS[state]) return STATE_LABELS[state]
  if (!state) return 'Unknown'
  const spaced = state.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

const formatEta = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds >= ETA_UNKNOWN || seconds <= 0) return '—'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${String(minutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
  return `${secs}s`
}

const formatAge = (addedOn: number): string => {
  if (!Number.isFinite(addedOn) || addedOn <= 0) return '—'
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000 - addedOn))
  if (elapsed < 60) return `${elapsed}s ago`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`
  return `${Math.floor(elapsed / 86400)}d ago`
}

const ghostLinkClass = 'text-xs text-gray-400 hover:text-blue-400 transition-colors'

const TorrentRow = ({
  torrent,
  showAge = false,
}: {
  torrent: TorrentProgress
  showAge?: boolean
}) => {
  const isComplete = torrent.progress >= 1 || torrent.state in COMPLETE_STATES
  const isFetchingMetadata = !isComplete && torrent.state in METADATA_STATES

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {isComplete && <CircleCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
        <span className="flex-1 min-w-0 truncate text-xs text-gray-200" title={torrent.name}>
          {torrent.name}
        </span>
        {showAge && (
          <span className="text-xs text-gray-500 flex-shrink-0">{formatAge(torrent.addedOn)}</span>
        )}
        <span className="font-mono text-xs text-gray-300 text-right flex-shrink-0 w-14">
          {`${(torrent.progress * 100).toFixed(1)}%`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
        {isFetchingMetadata ? (
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-blue-400 to-purple-500'
              }`}
            style={{ width: `${Math.min(100, torrent.progress * 100)}%` }}
          />
        )}
      </div>
      <div className="text-xs text-gray-400 flex items-center flex-wrap gap-x-3 gap-y-0.5">
        <span>{isFetchingMetadata ? 'Fetching metadata…' : humanizeState(torrent.state)}</span>
        {isComplete ? <span>Done</span> : <span>{`${formatBytes(torrent.dlspeed)}/s`}</span>}
        <span>{formatBytes(torrent.size)}</span>
        <span>{`S:${torrent.numSeeds} P:${torrent.numPeers}`}</span>
        {!isComplete && <span>{formatEta(torrent.eta)}</span>}
      </div>
    </div>
  )
}

const PlaceholderRow = ({ hash }: { hash: string }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2">
      <span className="flex-1 min-w-0 truncate font-mono text-xs text-gray-400" title={hash}>
        {hash.slice(0, 8)}
      </span>
      <span className="text-xs text-gray-500 flex-shrink-0">Queued…</span>
    </div>
    <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
      <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse" />
    </div>
  </div>
)

const OpenDownloaderLink = ({
  url,
  name,
  className = ghostLinkClass,
}: {
  url: string
  name: string
  className?: string
}) => (
  <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
    Open {name} →
  </a>
)

export const TorrentProgressPanel = ({
  hashes,
  downloaderName,
}: {
  hashes: readonly string[]
  downloaderName?: string
}) => {
  useSnapshot(configStore)
  useSnapshot(settingsStore)

  const [torrents, setTorrents] = useState<TorrentProgress[]>([])
  const [recent, setRecent] = useState<TorrentProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  /** Empty-state: user asked to peek at recent torrents before adding any. */
  const [browsing, setBrowsing] = useState(false)
  const emptyPollsRef = useRef(0)

  const hashKey = hashes.join(',')
  const hasTracked = hashes.length > 0
  const showRecent = hasTracked ? expanded : browsing
  const activeDownloader = getActiveDownloader()
  const resolvedDownloaderName = downloaderName ?? activeDownloader?.name
  const downloader =
    (resolvedDownloaderName
      ? configStore.downloaders.find((entry) => entry.name === resolvedDownloaderName)
      : undefined) ?? activeDownloader

  useEffect(() => {
    if (!hasTracked && !browsing) return

    const trackedHashes = hashKey.split(',').filter(Boolean)
    let cancelled = false
    let stopped = false
    let timer: number | undefined
    let inFlight = false

    emptyPollsRef.current = 0

    const stop = () => {
      stopped = true
      if (timer !== undefined) {
        window.clearTimeout(timer)
        timer = undefined
      }
    }

    const schedule = (delayMs: number) => {
      if (cancelled || stopped) return
      timer = window.setTimeout(() => void poll(), delayMs)
    }

    const poll = async () => {
      if (cancelled || stopped || inFlight) return
      inFlight = true
      try {
        const result = await fetchTorrentProgress(
          trackedHashes,
          resolvedDownloaderName,
          showRecent ? RECENT_LIMIT : 0
        )
        if (cancelled) return

        setTorrents(result.torrents)
        setRecent(result.recent)
        setError(null)

        emptyPollsRef.current = result.torrents.length === 0 ? emptyPollsRef.current + 1 : 0

        // Keep polling while the recent list is visible so it stays live.
        if (!showRecent) {
          const allComplete =
            result.torrents.length > 0 && result.torrents.every((torrent) => torrent.progress >= 1)
          if (allComplete || emptyPollsRef.current >= MAX_EMPTY_POLLS) {
            stop()
            return
          }
        }

        schedule(POLL_INTERVAL_MS)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch torrent progress')
        schedule(ERROR_POLL_INTERVAL_MS)
      } finally {
        inFlight = false
      }
    }

    void poll()

    return () => {
      cancelled = true
      stop()
    }
  }, [hashKey, resolvedDownloaderName, hasTracked, browsing, showRecent])

  const byHash = useMemo(() => {
    const map = new Map<string, TorrentProgress>()
    for (const torrent of torrents) map.set(torrent.hash.toLowerCase(), torrent)
    return map
  }, [torrents])

  const trackedSet = useMemo(
    () => new Set(hashKey.split(',').filter(Boolean).map((hash) => hash.toLowerCase())),
    [hashKey]
  )

  const recentRows = useMemo(
    () =>
      recent
        .filter((torrent) => !trackedSet.has(torrent.hash.toLowerCase()))
        .slice(0, RECENT_LIMIT),
    [recent, trackedSet]
  )

  // Collapse empty-state browse once a fresh add starts tracking hashes.
  useEffect(() => {
    if (hasTracked && browsing) setBrowsing(false)
  }, [hasTracked, browsing])

  if (!hasTracked && !browsing) {
    return (
      <div className="mt-4 text-center">
        <button type="button" onClick={() => setBrowsing(true)} className={ghostLinkClass}>
          ⟨ Pika the Q ⟩
        </button>
      </div>
    )
  }

  const aggregate =
    hashes.length > 0
      ? (torrents.reduce((sum, torrent) => sum + torrent.progress, 0) / hashes.length) * 100
      : 0

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mt-3">
      {hasTracked ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-200">
              Downloading {hashes.length} {hashes.length === 1 ? 'torrent' : 'torrents'}
            </span>
            <span className="font-mono text-sm text-blue-400">{`${aggregate.toFixed(1)}%`}</span>
          </div>
          {error && <p className="text-xs text-red-300 mt-1">{error}</p>}

          <div className="space-y-2 mt-3">
            {hashes.map((hash) => {
              const torrent = byHash.get(hash.toLowerCase())
              return torrent ? (
                <TorrentRow key={hash} torrent={torrent} />
              ) : (
                <PlaceholderRow key={hash} hash={hash} />
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-200">Recently in the queue</span>
            <span className="text-xs text-gray-500">last {RECENT_LIMIT}</span>
          </div>
          {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
        </>
      )}

      {showRecent && (
        <div className={hasTracked ? 'border-t border-gray-700 pt-3 mt-3' : 'mt-3'}>
          {hasTracked && (
            <p className="text-xs uppercase tracking-wide text-gray-500">Recently added</p>
          )}
          {recentRows.length > 0 ? (
            <div
              className={`max-h-80 overflow-y-auto space-y-2 pr-1 ${hasTracked ? 'mt-2' : ''}`}
            >
              {recentRows.map((torrent) => (
                <TorrentRow key={torrent.hash} torrent={torrent} showAge />
              ))}
            </div>
          ) : (
            <p className={`text-xs text-gray-500 ${hasTracked ? 'mt-2' : ''}`}>
              {error ? 'Could not load recent torrents' : 'Queue looks empty'}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        {hasTracked ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {expanded ? 'Show less' : 'See more'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setBrowsing(false)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Hide
          </button>
        )}

        {downloader ? (
          <OpenDownloaderLink url={downloader.url} name={downloader.name} />
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
