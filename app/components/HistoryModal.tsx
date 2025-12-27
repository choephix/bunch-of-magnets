import { useSnapshot } from 'valtio'
import { queryHistoryStore, queryHistoryActions } from '../stores/queryHistoryStore'
import { useState } from 'react'

export function HistoryModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (query: string) => void
}) {
  const { history, isLoading } = useSnapshot(queryHistoryStore)
  const [queryToDelete, setQueryToDelete] = useState<string | null>(null)

  const handleDelete = async (query: string) => {
    setQueryToDelete(query)
  }

  const confirmDelete = async () => {
    if (queryToDelete) {
      await queryHistoryActions.removeFromHistory(queryToDelete)
      setQueryToDelete(null)
    }
  }

  return (
    <div>
      {/* History Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-3 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-medium text-gray-100">Query History</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
                ×
              </button>
            </div>
            <div className="space-y-1">
              {isLoading ? (
                <p className="text-gray-400 text-xs">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-gray-400 text-xs">No history yet</p>
              ) : (
                history.map((query, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-1.5 hover:bg-gray-700 rounded cursor-pointer group"
                  >
                    <button
                      onClick={() => onSelect(query)}
                      className="flex-1 text-left text-xs text-gray-200 truncate"
                    >
                      {query}
                    </button>
                    <button
                      onClick={() => handleDelete(query)}
                      className="ml-1.5 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {queryToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 w-full max-w-sm">
            <h3 className="text-base font-medium text-gray-100 mb-2">Delete Query</h3>
            <p className="text-sm text-gray-300 mb-4">
              Are you sure you want to delete this query from history?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setQueryToDelete(null)}
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
