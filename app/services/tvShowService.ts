import { MagnetLink } from '../utils/magnet';

export async function parseTvShowName(displayName: string): Promise<string> {
  try {
    const response = await fetch('/api/parse-tv-shows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filenames: [displayName]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to parse TV show name');
    }

    const data = await response.json();
    return data.showNames[0];
  } catch (error) {
    console.error('❌ Error parsing TV show name:', error);
    throw error;
  }
}

export async function parseFirstTvShowName(magnetLinks: MagnetLink[]): Promise<void> {
  if (magnetLinks[0]?.displayName) {
    try {
      const showName = await parseTvShowName(magnetLinks[0].displayName);
      console.log('📺 Parsed TV show name:', showName);
    } catch (error) {
      console.error('❌ Error parsing TV show name:', error);
    }
  }
} 
