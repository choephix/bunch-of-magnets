import { proxy, subscribe } from 'valtio';

interface QueryHistoryState {
  history: string[];
  candidateQuery: string | null;
}

const STORAGE_KEY = 'bunch-of-magnets-query-history';
const MAX_HISTORY_ITEMS = 50;

const loadHistory = (): QueryHistoryState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('❌ Failed to load query history:', error);
  }
  return { history: [], candidateQuery: null };
};

export const queryHistoryStore = proxy<QueryHistoryState>(loadHistory());

// Subscribe to changes and save to localStorage
subscribe(queryHistoryStore, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queryHistoryStore));
  } catch (error) {
    console.error('❌ Failed to save query history:', error);
  }
});

export const queryHistoryActions = {
  setCandidateQuery: (query: string | null) => {
    queryHistoryStore.candidateQuery = query;
  },

  saveCandidateToHistory: () => {
    if (!queryHistoryStore.candidateQuery) return;
    
    // Remove if already exists to avoid duplicates
    const index = queryHistoryStore.history.indexOf(queryHistoryStore.candidateQuery);
    if (index !== -1) {
      queryHistoryStore.history.splice(index, 1);
    }
    
    // Add to beginning of array
    queryHistoryStore.history.unshift(queryHistoryStore.candidateQuery);
    
    // Trim history if too long
    if (queryHistoryStore.history.length > MAX_HISTORY_ITEMS) {
      queryHistoryStore.history = queryHistoryStore.history.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // Clear candidate
    queryHistoryStore.candidateQuery = null;
  },

  removeFromHistory: (query: string) => {
    const index = queryHistoryStore.history.indexOf(query);
    if (index !== -1) {
      queryHistoryStore.history.splice(index, 1);
    }
  },

  clearHistory: () => {
    queryHistoryStore.history = [];
    queryHistoryStore.candidateQuery = null;
  }
}; 