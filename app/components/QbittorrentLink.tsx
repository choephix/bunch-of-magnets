import { useSnapshot } from 'valtio';
import { configStore } from '../stores/configStore';

export const QbittorrentLink = () => {
  const { qbittorrentUrl } = useSnapshot(configStore);
  
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
