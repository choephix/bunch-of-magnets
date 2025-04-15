import { proxy, subscribe } from 'valtio';

type LibraryType = 'Live Action Series' | 'Cartoon Series' | 'Anime Series' | 'Live Action Movies' | 'Cartoon Movies' | 'Anime Movies' | 'Documentaries';

interface SettingsState {
  librarySuggestions: Record<LibraryType, boolean>;
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
};

const loadSettings = (): SettingsState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
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
  resetToDefaults: () => {
    settingsStore.librarySuggestions = { ...defaultSettings.librarySuggestions };
  }
}; 
