export type DownloaderType = 'qbittorrent' | 'transmission';

export interface DownloaderConfig {
  name: string;
  url: string;
  username: string;
  password: string;
  type: DownloaderType;
}

export interface AppConfig {
  downloaders: DownloaderConfig[];
}

let cachedConfig: AppConfig | null = null;

export function loadAppConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const base64 = process.env.APP_CONFIG_BASE64;
  if (!base64) {
    throw new Error('Missing APP_CONFIG_BASE64 env var');
  }

  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  cachedConfig = JSON.parse(decoded) as AppConfig;

  if (!cachedConfig.downloaders?.length) {
    throw new Error('APP_CONFIG_BASE64 must contain at least one downloader');
  }

  console.log(`🔧 Loaded ${cachedConfig.downloaders.length} downloader(s) from config`);
  return cachedConfig;
}

export function getDownloaderByName(name: string): DownloaderConfig {
  const config = loadAppConfig();
  const downloader = config.downloaders.find(d => d.name === name);
  if (!downloader) {
    throw new Error(`Downloader "${name}" not found in config`);
  }
  return downloader;
}

export function getDefaultDownloader(): DownloaderConfig {
  const config = loadAppConfig();
  return config.downloaders[0];
}

/** Returns downloaders without sensitive credentials (for client) */
export function getPublicDownloaderList() {
  const config = loadAppConfig();
  return config.downloaders.map(({ name, url, type }) => ({ name, url, type }));
}

