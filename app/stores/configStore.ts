import { proxy } from 'valtio';
import { fetchConfig } from '../services/configService';
import { settingsStore } from './settingsStore';

interface ConfigState {
  defaultQbittorrentUrl: string | null;
  isLoading: boolean;
}

const initialState: ConfigState = {
  defaultQbittorrentUrl: null,
  isLoading: true,
};

export const configStore = proxy<ConfigState>(initialState);

// Computed getter for effective URL (override takes precedence)
export const getQbittorrentUrl = () => 
  settingsStore.qbittorrentUrlOverride || configStore.defaultQbittorrentUrl;

export const configActions = {
  load: async () => {
    try {
      configStore.isLoading = true;
      const config = await fetchConfig();
      configStore.defaultQbittorrentUrl = config.qbittorrentUrl;
      console.log('✅ Config loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load config:', error);
    } finally {
      configStore.isLoading = false;
    }
  },
}; 
