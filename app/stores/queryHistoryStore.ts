import { proxy, subscribe } from 'valtio'

interface QueryHistoryState {
  history: string[]
  candidateQuery: string | null
  isLoading: boolean
}

const MAX_HISTORY_ITEMS = 50

const initialState: QueryHistoryState = {
  history: [],
  candidateQuery: null,
  isLoading: true,
}

export const queryHistoryStore = proxy<QueryHistoryState>(initialState)

// Load history from Upstash
const loadHistory = async () => {
  try {
    queryHistoryStore.isLoading = true
    const response = await fetch('/api/query-history')
    if (!response.ok) throw new Error('Failed to fetch history')
    const data = await response.json()
    queryHistoryStore.history = data.history
  } catch (error) {
    console.error('❌ Failed to load query history:', error)
  } finally {
    queryHistoryStore.isLoading = false
  }
}

// Save history to Upstash
const saveHistory = async (history: string[]) => {
  try {
    const response = await fetch('/api/query-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
    })
    if (!response.ok) throw new Error('Failed to save history')
  } catch (error) {
    console.error('❌ Failed to save query history:', error)
  }
}

// Initialize history on load
if (typeof window !== 'undefined') {
  loadHistory()
}

export const queryHistoryActions = {
  setCandidateQuery: (query: string | null) => {
    queryHistoryStore.candidateQuery = query
  },

  saveCandidateToHistory: async () => {
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

    // Save to Upstash
    await saveHistory(queryHistoryStore.history)

    // Clear candidate
    queryHistoryStore.candidateQuery = null
  },

  removeFromHistory: async (query: string) => {
    const index = queryHistoryStore.history.indexOf(query)
    if (index !== -1) {
      queryHistoryStore.history.splice(index, 1)
      await saveHistory(queryHistoryStore.history)
    }
  },

  clearHistory: async () => {
    queryHistoryStore.history = []
    queryHistoryStore.candidateQuery = null
    await saveHistory([])
  },
}
