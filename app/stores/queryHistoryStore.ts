import { proxy, subscribe } from 'valtio'

interface QueryHistoryState {
  history: string[]
  candidateQuery: string | null
  isLoading: boolean
}

const STORAGE_KEY = 'bunch-of-magnets-query-history'
const MAX_HISTORY_ITEMS = 50

const loadHistory = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_HISTORY_ITEMS)
      }
    }
  } catch (error) {
    console.error('❌ Failed to load query history from localStorage:', error)
  }
  return []
}

const initialState: QueryHistoryState = {
  history: typeof window !== 'undefined' ? loadHistory() : [],
  candidateQuery: null,
  isLoading: false,
}

export const queryHistoryStore = proxy<QueryHistoryState>(initialState)

if (typeof window !== 'undefined') {
  subscribe(queryHistoryStore, () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queryHistoryStore.history))
    } catch (error) {
      console.error('❌ Failed to save query history to localStorage:', error)
    }
  })
}

export const queryHistoryActions = {
  setCandidateQuery: (query: string | null) => {
    queryHistoryStore.candidateQuery = query
  },

  saveCandidateToHistory: () => {
    if (!queryHistoryStore.candidateQuery) return

    // Remove if already exists to avoid duplicates
    const index = queryHistoryStore.history.indexOf(queryHistoryStore.candidateQuery)
    if (index !== -1) {
      queryHistoryStore.history.splice(index, 1)
    }

    // Add to beginning of array
    queryHistoryStore.history.unshift(queryHistoryStore.candidateQuery)

    // Trim history if too long
    if (queryHistoryStore.history.length > MAX_HISTORY_ITEMS) {
      queryHistoryStore.history = queryHistoryStore.history.slice(0, MAX_HISTORY_ITEMS)
    }

    // Clear candidate
    queryHistoryStore.candidateQuery = null
  },

  removeFromHistory: (query: string) => {
    const index = queryHistoryStore.history.indexOf(query)
    if (index !== -1) {
      queryHistoryStore.history.splice(index, 1)
    }
  },

  clearHistory: () => {
    queryHistoryStore.history = []
    queryHistoryStore.candidateQuery = null
  },
}
