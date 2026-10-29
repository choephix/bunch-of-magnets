/** Track successful adds per downloader, in first-added order with lowercase identities. */
export function trackAddedTorrents(
  tracked: ReadonlyMap<string, readonly string[]>,
  downloaderName: string,
  addedHashes: readonly string[]
): Map<string, readonly string[]> {
  const hashes = new Set((tracked.get(downloaderName) ?? []).map((hash) => hash.toLowerCase()))
  for (const hash of addedHashes) hashes.add(hash.toLowerCase())

  const next = new Map(tracked)
  next.set(downloaderName, [...hashes])
  return next
}
