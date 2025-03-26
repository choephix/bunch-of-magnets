export type MagnetLink = {
  magnetUrl: string;
  displayName: string;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
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
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('magnet:?'))
    .map(magnetUrl => {
      const nameMatch = magnetUrl.match(/dn=([^&]+)/);
      const displayName = nameMatch 
        ? decodeURIComponent(nameMatch[1])
        : magnetUrl.slice(0, 50) + '...';
      
      return { magnetUrl, displayName };
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

  console.log('🏷️ Parsed tags for', displayName, ':', tags);
  return tags;
} 