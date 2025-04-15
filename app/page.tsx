'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { logout } from './services/authService';
import { fetchConfig } from './services/configService';
import { addTorrents } from './services/qbittorrentService';
import { appStateActions, useAppState } from './stores/appStateStore';
import { MagnetLink, debounce, parseMagnetLinks } from './utils/magnet';
import { MagnetExtractionLoader } from './components/MagnetExtractionLoader';
import { SettingsModal } from './components/SettingsModal';
import { SuggestionPills } from './components/SuggestionPills';

export default function Home() {
  const [magnetInput, setMagnetInput] = useState('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
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

  const handleLogout = async () => {
    await logout();
  };

  const removeMagnetLink = (index: number) => {
    console.log(`🗑️ Removing magnet link at index ${index}`);
    appStateActions.removeMagnetLink(index);
  };

  const updateMagnetLinks = useCallback(
    debounce((text: string) => {
      const parsed = parseMagnetLinks(text);
      console.log('🔍 Parsed new magnet links:', parsed.length);
      appStateActions.addMagnetLinks(parsed);
      setMagnetInput('');
    }, 150),
    []
  );

  const isUrl = (text: string) => {
    if (text.startsWith('magnet:?')) {
      return false;
    }

    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const extractMagnetsFromUrl = async (url: string) => {
    setIsExtracting(true);
    try {
      console.log('🔗 Extracting magnets from URL:', url);
      const response = await fetch('/api/extract-magnets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data: { magnetLinks: MagnetLink[]; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract magnet links');
      }

      // Create a mutable copy of the magnet links
      const mutableLinks = [...data.magnetLinks];
      appStateActions.addMagnetLinks(mutableLinks);
    } catch (error) {
      console.error('❌ Error extracting magnets from URL:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to extract magnet links from URL',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMagnetInput = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMagnetInput(text);

    if (isUrl(text)) {
      await extractMagnetsFromUrl(text);
      setMagnetInput('');
      return;
    }

    updateMagnetLinks(text);
  };

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

        <div className='absolute top-4 right-4 flex gap-2'>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className='text-gray-400 hover:text-blue-400 transition-colors'
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleLogout}
            className='text-gray-400 hover:text-red-400 transition-colors'
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />

        <form
          onSubmit={handleSubmit}
          className='space-y-6 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700'
        >
          <div>
            <label htmlFor='savePath' className='block text-xs font-medium mb-1 text-gray-300'>
              Save Directory
            </label>
            <input
              type='text'
              id='savePath'
              value={savePath}
              onChange={e => appStateActions.setSavePath(e.target.value)}
              className='w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all'
              placeholder='/path/to/save/directory'
              required
            />
          </div>

          <SuggestionPills />

          <div className='mb-1'>
            <label htmlFor='magnetInput' className='block text-xs font-medium mb-1 text-gray-300'>
              Magnet Links
            </label>
            <div className='bg-gray-900 border border-gray-700 rounded-lg overflow-hidden'>
              <textarea
                id='magnetInput'
                value={magnetInput}
                onChange={handleMagnetInput}
                disabled={isExtracting}
                className={`w-full h-16 bg-transparent font-mono text-xs text-gray-100 focus:outline-none focus:ring-0 focus:border-0 transition-all resize-none p-4 ${
                  isExtracting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder='Paste magnet link here (magnet:?xt=...) or a website url with magnet links.'
              />
              {(magnetLinks.length > 0 || isExtracting) && (
                <>
                  <div className='h-px bg-gray-700' />
                  {isExtracting && (
                    <MagnetExtractionLoader />
                  )}
                  <div className='space-y-1'>
                    {magnetLinks.map((item, index) => (
                      <div
                        key={index}
                        className={`text-xs hover:bg-gray-800 rounded transition-colors flex items-center group cursor-pointer ${
                          item.ignore ? 'opacity-40' : 'text-gray-200'
                        }`}
                        onClick={() => appStateActions.toggleIgnoreMagnetLink(index)}
                      >
                        <div className='flex-1 min-w-0 flex items-center space-x-2 px-4'>
                          <span className='truncate' title={item.displayName || item.magnetUrl}>
                            {item.displayName || item.magnetUrl}
                          </span>
                        </div>
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeMagnetLink(index);
                          }}
                          className='ml-2 px-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-900 rounded text-2xl font-medium hover:bg-gray-800/50'
                          aria-label='Remove magnet link'
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {magnetLinks.length > 0 && (
            <>
              {magnetLinks.length > 1 && (
                <div className='flex gap-2 justify-end -mt-1 mb-1'>
                  <button
                    type='button'
                    onClick={() => appStateActions.sortMagnetLinksByName()}
                    className='text-xs px-2 py-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors'
                  >
                    sort by name
                  </button>
                  <button
                    type='button'
                    onClick={() => appStateActions.selectAllMagnetLinks()}
                    className='text-xs px-2 py-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors'
                  >
                    select all
                  </button>
                  <button
                    type='button'
                    onClick={() => appStateActions.selectNoneMagnetLinks()}
                    className='text-xs px-2 py-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors'
                  >
                    select none
                  </button>
                </div>
              )}
            </>
          )}

          {magnetLinks.length > 0 && (
            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-3 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 
              disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl disabled:hover:shadow-none 
              cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
              mt-4'
            >
              {isLoading
                ? 'Adding...'
                : `Add ${magnetLinks.filter(m => !m.ignore).length} Torrents`}
            </button>
          )}
        </form>

        {status && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              status.type === 'success'
                ? 'bg-green-900/50 text-green-200 border border-green-800'
                : 'bg-red-900/50 text-red-200 border border-red-800'
            }`}
          >
            {status.message}
          </div>
        )}

        {qbittorrentUrl && (
          <div className='mt-4 text-center'>
            <a
              href={qbittorrentUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='text-xs text-gray-400 hover:text-blue-400 transition-colors'
            >
              Open qBittorrent Web UI →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
