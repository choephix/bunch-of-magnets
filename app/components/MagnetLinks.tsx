import { useCallback, useState } from "react";
import { useSnapshot } from "valtio";
import { useProcessMagnetLinkQueries } from "../hooks/useMagnetQuery";
import { appStateActions, useAppState } from "../stores/appStateStore";
import {
  queryHistoryActions,
  queryHistoryStore,
} from "../stores/queryHistoryStore";
import { debounce } from "../utils/magnet";
import { MagnetExtractionLoader } from "./MagnetExtractionLoader";

interface MagnetLinksProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}

export const MagnetLinks = ({ onSubmit, isLoading }: MagnetLinksProps) => {
  const [magnetInput, setMagnetInput] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { magnetLinks, isExtracting } = useAppState();

  const { error, processMagnetLinkQueries } = useProcessMagnetLinkQueries();

  const removeMagnetLink = (index: number) => {
    console.log(`🗑️ Removing magnet link at index ${index}`);
    appStateActions.removeMagnetLink(index);
  };

  const handleMagnetInput = async (text: string) => {
    setMagnetInput(text);
    processMagnetLinks(text);
  };

  const processMagnetLinks = useCallback(
    debounce(async (text: string) => {
      const lines = text.split("\n");
      await processMagnetLinkQueries(lines);
      setMagnetInput("");
    }, 150),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    await onSubmit(e);
    queryHistoryActions.saveCandidateToHistory();
  };

  const handleHistorySelect = (query: string) => {
    setIsHistoryOpen(false);
    setMagnetInput(query);
    handleMagnetInput(query);
  };

  return (
    <div className="space-y-3">
      <div className="mb-0.5">
        <label
          htmlFor="magnetInput"
          className="block text-xs font-medium mb-0.5 text-gray-300"
        >
          Magnet Links
        </label>
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <textarea
            id="magnetInput"
            value={magnetInput}
            onChange={(e) => handleMagnetInput(e.target.value)}
            onDoubleClick={() => setIsHistoryOpen(true)}
            disabled={isExtracting}
            className={`w-full h-14 bg-transparent font-mono text-xs text-gray-100 focus:outline-none focus:ring-0 focus:border-0 transition-all resize-none p-3 ${
              isExtracting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            placeholder="Paste magnet link here (magnet:?xt=...) or a website url with magnet links. Double click to view history."
          />
          {(magnetLinks.length > 0 || isExtracting) && (
            <>
              <div className="h-px bg-gray-700" />
              {isExtracting && <MagnetExtractionLoader />}
              <div className="space-y-0.5">
                {magnetLinks.map((item, index) => (
                  <div
                    key={index}
                    className={`text-xs hover:bg-gray-800 rounded transition-colors flex items-center group cursor-pointer ${
                      item.ignore ? "opacity-40" : "text-gray-200"
                    }`}
                    onClick={() =>
                      appStateActions.toggleIgnoreMagnetLink(index)
                    }
                  >
                    <div className="flex-1 min-w-0 flex items-center space-x-2 px-3">
                      <span
                        className="truncate"
                        title={item.displayName || item.magnetUrl}
                      >
                        {item.displayName || item.magnetUrl}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeMagnetLink(index);
                      }}
                      className="ml-1 px-1.5 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-900 rounded text-xl font-medium hover:bg-gray-800/50"
                      aria-label="Remove magnet link"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {magnetLinks.length > 0 && (
        <>
          {magnetLinks.length > 1 && (
            <div className="flex gap-1.5 justify-end -mt-0.5 mb-0.5">
              <button
                type="button"
                onClick={() => appStateActions.sortMagnetLinksByName()}
                className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
              >
                sort by name
              </button>
              <button
                type="button"
                onClick={() => appStateActions.selectAllMagnetLinks()}
                className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
              >
                select all
              </button>
              <button
                type="button"
                onClick={() => appStateActions.selectNoneMagnetLinks()}
                className="text-xs px-1.5 py-0.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
              >
                select none
              </button>
            </div>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-1.5 px-3 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 
            disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl disabled:hover:shadow-none 
            cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
            mt-3"
          >
            {isLoading
              ? "Adding..."
              : `Add ${magnetLinks.filter((m) => !m.ignore).length} Torrents`}
          </button>
        </>
      )}

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleHistorySelect}
      />
    </div>
  );
};

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
