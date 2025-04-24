import { useSnapshot } from "valtio";
import { queryHistoryStore, queryHistoryActions } from "../stores/queryHistoryStore";

export function HistoryModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (query: string) => void;
}) {
  const { history, isLoading } = useSnapshot(queryHistoryStore);

  return (
    <div>
      {/* History Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-3 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-medium text-gray-100">
                Query History
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200"
              >
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
                      onClick={() =>
                        queryHistoryActions.removeFromHistory(query)
                      }
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
    </div>
  );
}
