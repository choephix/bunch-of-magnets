'use client';

import { useEffect, useState } from 'react';
import { MagnetLinks } from './components/MagnetLinks';
import { NavButtons } from './components/NavButtons';
import { QbittorrentLink } from './components/QbittorrentLink';
import { SaveDir } from './components/SaveDir';
import { SettingsModal } from './components/SettingsModal';
import { StatusMessage } from './components/StatusMessage';
import { SuggestionPills } from './components/SuggestionPills';
import { useAppState } from './stores/appStateStore';
import { useMagnetSubmission } from './hooks/useMagnetSubmission';
import { configActions } from './stores/configStore';

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { magnetLinks, savePath } = useAppState();
  const { isLoading, status, submitMagnetLinks } = useMagnetSubmission();

  useEffect(() => {
    configActions.load();
  }, []);

  return (
    <div className='min-h-screen bg-gray-900 text-gray-100 p-3 sm:p-6'>
      <main className='max-w-2xl mx-auto'>
        <h1 className='text-xl py-2 font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent'>
          Bunch of Magnets
        </h1>

        <NavButtons onSettingsClick={() => setIsSettingsOpen(true)} />

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        <div className='space-y-6 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700'>
          <SaveDir />
          <SuggestionPills />
          <MagnetLinks 
            onSubmit={() => submitMagnetLinks([...magnetLinks], savePath)} 
            isLoading={isLoading} 
          />
        </div>

        <StatusMessage status={status} />
        
        <QbittorrentLink />
      </main>
    </div>
  );
}
