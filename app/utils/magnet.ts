export type MagnetLink = {
  magnetUrl: string;
  displayName: string;
  ignore: boolean;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
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
        const bencodeModule = await import('bencode');
        const bencode = bencodeModule.default;
        
        // Parse torrent file using bencode library
        const torrent = bencode.decode(torrentData);
        
        console.log("🔍 Raw torrent data:", torrent);
        console.log("🔍 Torrent info:", torrent.info);
        console.log("🔍 Torrent announce:", torrent.announce);
        console.log("🔍 Torrent announce-list:", torrent['announce-list']);
        
        if (!torrent || !torrent.info) {
          reject(new Error("Invalid torrent file"));
          return;
        }
        
        // Log all info fields
        console.log("🔍 Info fields:", Object.keys(torrent.info));
        console.log("🔍 Info name type:", typeof torrent.info.name);
        console.log("🔍 Info name value:", torrent.info.name);
        
        // Convert Uint8Array to string if needed
        let displayName: string;
        if (torrent.info.name instanceof Uint8Array) {
          displayName = new TextDecoder().decode(torrent.info.name);
          console.log("🔍 Converted name from Uint8Array:", displayName);
        } else if (typeof torrent.info.name === 'string') {
          displayName = torrent.info.name;
          console.log("🔍 Name is already string:", displayName);
        } else {
          displayName = file.name.replace('.torrent', '');
          console.log("🔍 Using filename as fallback:", displayName);
        }
        
        // Generate magnet link from torrent data
        const magnetLink = await generateMagnetFromTorrent(torrent);
        
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
  const bencodeModule = await import('bencode');
  const bencode = bencodeModule.default;
  
  console.log("🔍 Generating magnet link from torrent info:", torrent.info);
  
  // Calculate the info hash by encoding the info dictionary
  const infoEncoded = bencode.encode(torrent.info);
  console.log("🔍 Encoded info:", infoEncoded);
  
  const infoHash = await calculateSHA1(infoEncoded);
  console.log("🔍 Calculated info hash:", infoHash);
  
  const magnetLink = `magnet:?xt=urn:btih:${infoHash}`;
  console.log("🔍 Base magnet link:", magnetLink);
  
  // Add trackers if available
  if (torrent.announce) {
    const announce = Array.isArray(torrent.announce) ? torrent.announce[0] : torrent.announce;
    console.log("🔍 Announce tracker:", announce);
    if (announce) {
      const trackerUrl = announce instanceof Uint8Array ? new TextDecoder().decode(announce) : announce.toString();
      const finalMagnetLink = `${magnetLink}&tr=${encodeURIComponent(trackerUrl)}`;
      console.log("🔍 Final magnet link with tracker:", finalMagnetLink);
      return finalMagnetLink;
    }
  }
  
  console.log("🔍 Final magnet link without tracker:", magnetLink);
  return magnetLink;
}

async function calculateSHA1(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
