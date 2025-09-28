export type MagnetLink = {
  magnetUrl: string;
  displayName: string;
  ignore: boolean;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function parseMagnetLinks(text: string): MagnetLink[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("magnet:?"))
    .map((magnetUrl) => {
      const nameMatch = magnetUrl.match(/dn=([^&]+)/);
      const displayName = nameMatch
        ? decodeURIComponent(nameMatch[1])
        : magnetUrl.slice(0, 50) + "...";

      return { magnetUrl, displayName, ignore: false };
    });
}

export function parseTags(displayName: string): string[] {
  const tags: string[] = [];

  // Parse group tag from [group] prefix
  const groupMatch = displayName.match(/^\[([^\]]+)\]/);
  if (groupMatch) {
    tags.push(groupMatch[1].toLowerCase());
  }

  // Parse resolution tag (e.g., 1080p, 720p, etc.)
  const resolutionMatch = displayName.match(/[^a-zA-Z0-9](\d+p)[^a-zA-Z0-9]/);
  if (resolutionMatch) {
    tags.push(resolutionMatch[1].toLowerCase());
  }

  console.log("🏷️ Parsed tags for", displayName, ":", tags);
  return tags;
}

export async function parseTorrentFile(file: File): Promise<MagnetLink[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const torrentData = new Uint8Array(arrayBuffer);
        
        // Import bencode dynamically to avoid SSR issues
        const bencode = await import('bencode');
        
        // Parse torrent file using bencode library
        const torrent = bencode.decode(torrentData);
        
        if (!torrent || !torrent.info) {
          reject(new Error("Invalid torrent file"));
          return;
        }
        
        // Generate magnet link from torrent data
        const magnetLink = await generateMagnetFromTorrent(torrent);
        
        // Extract display name from torrent
        const displayName = torrent.info.name?.toString() || file.name.replace('.torrent', '');
        
        resolve([{
          magnetUrl: magnetLink,
          displayName: displayName,
          ignore: false
        }]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read torrent file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
}


async function generateMagnetFromTorrent(torrent: any): Promise<string> {
  // Import bencode dynamically to avoid SSR issues
  const bencode = await import('bencode');
  
  // Calculate the info hash by encoding the info dictionary
  const infoEncoded = bencode.encode(torrent.info);
  const infoHash = await calculateSHA1(infoEncoded);
  
  const magnetLink = `magnet:?xt=urn:btih:${infoHash}`;
  
  // Add trackers if available
  if (torrent.announce) {
    const announce = Array.isArray(torrent.announce) ? torrent.announce[0] : torrent.announce;
    if (announce) {
      return `${magnetLink}&tr=${encodeURIComponent(announce.toString())}`;
    }
  }
  
  return magnetLink;
}

async function calculateSHA1(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
