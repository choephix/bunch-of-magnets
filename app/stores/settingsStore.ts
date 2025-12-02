import { proxy, subscribe } from 'valtio';

type LibraryType =
  | 'Live Action Series'
  | 'Cartoon Series'
  | 'Anime Series'
  | 'Live Action Movies'
  | 'Cartoon Movies'
  | 'Anime Movies'
  | 'Documentaries';

interface SettingsState {
  librarySuggestions: Record<LibraryType, boolean>;
  qbittorrentUrlOverride: string | null;
}

const STORAGE_KEY = 'bunch-of-magnets-settings';

const defaultSettings: SettingsState = {
  librarySuggestions: {
    'Live Action Series': true,
    'Cartoon Series': false,
    'Anime Series': true,
    'Live Action Movies': false,
    'Cartoon Movies': false,
    'Anime Movies': false,
    'Documentaries': true,
  },
  qbittorrentUrlOverride: null,
};

const loadSettings = (): SettingsState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields for existing users
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('❌ Failed to load settings:', error);
  }
  return defaultSettings;
};

export const settingsStore = proxy<SettingsState>(loadSettings());

// Subscribe to changes and save to localStorage
subscribe(settingsStore, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsStore));
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
  }
});

export const settingsActions = {
  toggleLibrarySuggestion: (type: LibraryType) => {
    settingsStore.librarySuggestions[type] = !settingsStore.librarySuggestions[type];
  },
  setQbittorrentUrlOverride: (url: string | null) => {
    settingsStore.qbittorrentUrlOverride = url?.trim() || null;
  },
  resetToDefaults: () => {
    settingsStore.librarySuggestions = { ...defaultSettings.librarySuggestions };
    settingsStore.qbittorrentUrlOverride = null;
  },
};
