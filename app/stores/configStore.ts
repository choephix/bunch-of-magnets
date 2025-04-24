import { proxy } from 'valtio';
import { fetchConfig } from '../services/configService';

interface ConfigState {
  qbittorrentUrl: string | null;
  isLoading: boolean;
}

const initialState: ConfigState = {
  qbittorrentUrl: null,
  isLoading: true,
};

export const configStore = proxy<ConfigState>(initialState);

export const configActions = {
  load: async () => {
    try {
      configStore.isLoading = true;
      const config = await fetchConfig();
      configStore.qbittorrentUrl = config.qbittorrentUrl;
      console.log('✅ Config loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load config:', error);
    } finally {
      configStore.isLoading = false;
    }
  },
}; 