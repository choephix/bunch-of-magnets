import { proxy } from 'valtio';
import { fetchConfig, PublicDownloader } from '../services/configService';
import { appStateActions } from './appStateStore';
import { settingsStore } from './settingsStore';

interface ConfigState {
  downloaders: PublicDownloader[];
  isLoading: boolean;
}

const initialState: ConfigState = {
  downloaders: [],
  isLoading: true,
};

export const configStore = proxy<ConfigState>(initialState);

/** Get the active downloader (selected or first available) */
export const getActiveDownloader = (): PublicDownloader | null => {
  const { downloaders } = configStore;
  if (!downloaders.length) return null;

  const selected = settingsStore.selectedDownloader;
  if (selected) {
    const found = downloaders.find(d => d.name === selected);
    if (found) return found;
  }
  return downloaders[0];
};

export const configActions = {
  load: async () => {
    try {
      configStore.isLoading = true;
      const config = await fetchConfig();
      configStore.downloaders = config.downloaders;
      console.log(`✅ Config loaded: ${config.downloaders.length} downloader(s)`);

      // Initialize basePath from active downloader
      const active = getActiveDownloader();
      if (active?.basePath) {
        appStateActions.setBasePath(active.basePath);
      }
    } catch (error) {
      console.error('❌ Failed to load config:', error);
    } finally {
      configStore.isLoading = false;
    }
  },

  /** Call when selected downloader changes to update basePath */
  updateBasePath: () => {
    const active = getActiveDownloader();
    if (active?.basePath) {
      appStateActions.setBasePath(active.basePath);
    }
  },
};
