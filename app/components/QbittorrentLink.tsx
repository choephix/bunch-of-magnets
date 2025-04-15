interface QbittorrentLinkProps {
  url: string | null;
}

export const QbittorrentLink = ({ url }: QbittorrentLinkProps) => {
  if (!url) return null;

  return (
    <div className='mt-4 text-center'>
      <a
        href={url}
        target='_blank'
        rel='noopener noreferrer'
        className='text-xs text-gray-400 hover:text-blue-400 transition-colors'
      >
        Open qBittorrent Web UI →
      </a>
    </div>
  );
}; 
