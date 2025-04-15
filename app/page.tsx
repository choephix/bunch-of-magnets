'use client';

import { useEffect, useState } from 'react';
import { MagnetLinks } from './components/MagnetLinks';
import { NavButtons } from './components/NavButtons';
import { QbittorrentLink } from './components/QbittorrentLink';
import { SaveDir } from './components/SaveDir';
import { SettingsModal } from './components/SettingsModal';
import { StatusMessage } from './components/StatusMessage';
import { SuggestionPills } from './components/SuggestionPills';
import { fetchConfig } from './services/configService';
import { addTorrents } from './services/qbittorrentService';
import { appStateActions, useAppState } from './stores/appStateStore';

export default function Home() {
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qbittorrentUrl, setQbittorrentUrl] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { magnetLinks, savePath } = useAppState();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchConfig();
        setQbittorrentUrl(config.qbittorrentUrl);
      } catch (error) {
        console.error('❌ Failed to fetch configuration:', error);
      }
    };

    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className='min-h-screen bg-gray-900 text-gray-100 p-3 sm:p-6'>
      <main className='max-w-2xl mx-auto'>
        <h1 className='text-xl py-2 font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent'>
          Bunch of Magnets
        </h1>

        <NavButtons onSettingsClick={() => setIsSettingsOpen(true)} />

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        <form
          onSubmit={handleSubmit}
          className='space-y-6 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700'
        >
          <SaveDir />
          <SuggestionPills />
          <MagnetLinks onSubmit={handleSubmit} isLoading={isLoading} />
        </form>

        <StatusMessage status={status} />
        
        <QbittorrentLink url={qbittorrentUrl} />
      </main>
    </div>
  );
}
