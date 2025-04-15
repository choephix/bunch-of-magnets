import { useState } from 'react';
import { MagnetLink } from '../utils/magnet';
import { addTorrents } from '../services/qbittorrentService';
import { appStateActions } from '../stores/appStateStore';

interface UseMagnetSubmissionResult {
  isLoading: boolean;
  status: { type: 'success' | 'error'; message: string } | null;
  submitMagnetLinks: (magnetLinks: MagnetLink[], savePath: string) => Promise<void>;
}

export const useMagnetSubmission = (): UseMagnetSubmissionResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const submitMagnetLinks = async (magnetLinks: MagnetLink[], savePath: string) => {
    setIsLoading(true);
    setStatus(null);

    try {
      console.log('🚀 Starting to add torrents:', magnetLinks.length);
      const selectedLinks = magnetLinks.filter(link => !link.ignore);
      await addTorrents(
        selectedLinks,
        savePath,
        'tvshow-anime',
        selectedLinks.map(link => link.displayName).filter(Boolean)
      );

      setStatus({
        type: 'success',
        message: `Added ${selectedLinks.length} torrents`,
      });

      appStateActions.clearMagnetLinks();
    } catch (error) {
      console.error('❌ Error:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add torrents',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, status, submitMagnetLinks };
}; 
