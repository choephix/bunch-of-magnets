import { X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { configStore } from '../stores/configStore';
import { settingsActions, settingsStore } from '../stores/settingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { librarySuggestions, qbittorrentUrlOverride } = useSnapshot(settingsStore);
  const { defaultQbittorrentUrl } = useSnapshot(configStore);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div ref={modalRef} className='bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 relative'>
        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors'
        >
          <X size={20} />
        </button>
        <h2 className='text-xl font-bold mb-4'>Settings</h2>

        <div className='space-y-6'>
          <div>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>qBittorrent URL</h3>
            <input
              type='url'
              value={qbittorrentUrlOverride ?? ''}
              onChange={e => settingsActions.setQbittorrentUrlOverride(e.target.value)}
              placeholder={defaultQbittorrentUrl ?? 'http://localhost:8080'}
              className='w-full px-3 py-2 bg-gray-700/50 rounded-lg text-gray-200 placeholder-gray-500 
                         border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Override the default URL for opening qBittorrent Web UI
            </p>
          </div>

          <div>
            <h3 className='text-sm font-medium text-gray-300 mb-2'>Library Suggestions</h3>
            <div className='space-y-2'>
              {Object.entries(librarySuggestions).map(([type, enabled]) => (
                <button
                  key={type}
                  onClick={() =>
                    settingsActions.toggleLibrarySuggestion(type as keyof typeof librarySuggestions)
                  }
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    enabled
                      ? 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                  }`}
                >
                  <span>{type}</span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
