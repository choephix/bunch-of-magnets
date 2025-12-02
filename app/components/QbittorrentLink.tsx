import { useSnapshot } from 'valtio';
import { configStore } from '../stores/configStore';
import { settingsStore } from '../stores/settingsStore';

export const QbittorrentLink = () => {
  const { defaultQbittorrentUrl } = useSnapshot(configStore);
  const { qbittorrentUrlOverride } = useSnapshot(settingsStore);

  const qbittorrentUrl = qbittorrentUrlOverride || defaultQbittorrentUrl;

  if (!qbittorrentUrl) return null;

  return (
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
  );
};
