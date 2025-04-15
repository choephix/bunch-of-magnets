"use client";

import { useCallback, useState, useEffect } from "react";
import { MagnetLink, debounce, parseMagnetLinks, parseTags } from "./utils/magnet";
import { parseFirstTvShowName, parseSeasons } from "./services/tvShowService";
import { addTorrents } from "./services/qbittorrentService";
import { fetchConfig } from "./services/configService";
import { logout } from "./services/authService";

type TorrentStatus = {
  magnetUrl: string;
  displayName?: string;
  status: "pending" | "adding" | "success" | "error";
  error?: string;
  tags?: string[];
};

type SuggestionPill = {
  type: "showname" | "season" | "library";
  value: string | number;
};

export default function Home() {
  const [magnetInput, setMagnetInput] = useState("");
  const [magnetLinks, setMagnetLinks] = useState<MagnetLink[]>([]);
  const [torrentStatuses, setTorrentStatuses] = useState<TorrentStatus[]>([]);
  const [savePath, setSavePath] = useState("/storage/Library/Temp/");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [qbittorrentUrl, setQbittorrentUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionPill[]>([
    { type: "library", value: "Live Action Series" },
    { type: "library", value: "Anime Series" }
  ]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchConfig();
        setQbittorrentUrl(config.qbittorrentUrl);
      } catch (error) {
        console.error('❌ Failed to fetch configuration:', error);
      }
    };

    loadConfig();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const removeMagnetLink = (index: number) => {
    console.log(`🗑️ Removing magnet link at index ${index}`);
    setMagnetLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShowNameParsed = (showName: string) => {
    setSuggestions(prev => {
      const newSuggestion = { type: "showname" as const, value: showName };
      // Check for duplicates
      if (prev.some(s => s.type === "showname" && s.value === showName)) return prev;
      return [...prev, newSuggestion];
    });
  };

  const handleSeasonsParsed = (seasons: number[]) => {
    setSuggestions(prev => {
      const newSuggestions = seasons.map(season => ({
        type: "season" as const,
        value: season
      }));
      // Filter out existing season suggestions
      const existingSeasons = new Set(prev.filter(s => s.type === "season").map(s => s.value));
      const uniqueNewSuggestions = newSuggestions.filter(s => !existingSeasons.has(s.value));
      return [...prev, ...uniqueNewSuggestions];
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Copied to clipboard:', text);
    } catch (err) {
      console.error('❌ Failed to copy:', err);
    }
  };

  const updateMagnetLinks = useCallback(
    debounce(async (text: string) => {
      const parsed = parseMagnetLinks(text);
      console.log("🔍 Parsed new magnet links:", parsed.length);

      // Create a Set of existing magnet URLs to check for duplicates
      const existingUrls = new Set(magnetLinks.map((link) => link.magnetUrl));

      // Filter out duplicates and add new links
      const newLinks = parsed.filter(
        (link) => !existingUrls.has(link.magnetUrl)
      );

      if (newLinks.length > 0) {
        console.log("✨ Adding new unique links:", newLinks.length);
        setMagnetLinks((prev) => [...prev, ...newLinks]);
        const showName = await parseFirstTvShowName(newLinks);
        if (showName) {
          handleShowNameParsed(showName);
        }
        const seasons = parseSeasons(newLinks);
        if (seasons.length > 0) {
          handleSeasonsParsed(seasons);
        }
      } else {
        console.log("⚠️ No new unique links found");
      }

      setMagnetInput("");
    }, 150),
    [magnetLinks]
  );

  const isUrl = (text: string) => {
    // Check if the URL is a magnet link
    if (text.startsWith("magnet:?")) {
      return false;
    }

    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const extractMagnetsFromUrl = async (url: string) => {
    setIsExtracting(true);
    try {
      console.log("🔗 Extracting magnets from URL:", url);
      const response = await fetch("/api/extract-magnets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data: { magnetLinks: MagnetLink[]; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract magnet links");
      }

      // Create a Set of existing magnet URLs to check for duplicates
      const existingUrls = new Set(magnetLinks.map((link) => link.magnetUrl));

      // Filter out duplicates and add new links
      const newLinks = data.magnetLinks.filter(
        (link) => !existingUrls.has(link.magnetUrl)
      );

      if (newLinks.length > 0) {
        console.log("✨ Adding new unique links from URL:", newLinks.length);
        setMagnetLinks((prev) => [...prev, ...newLinks]);
      } else {
        console.log("⚠️ No new unique links found in URL");
      }
    } catch (error) {
      console.error("❌ Error extracting magnets from URL:", error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to extract magnet links from URL",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMagnetInput = async (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const text = e.target.value;
    setMagnetInput(text);

    // If the input is a URL, extract magnets from it
    if (isUrl(text)) {
      await extractMagnetsFromUrl(text);
      setMagnetInput("");
      return;
    }

    // Otherwise, process as regular magnet links
    updateMagnetLinks(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    // Initialize statuses for all magnet links
    const initialStatuses: TorrentStatus[] = magnetLinks.map((link) => ({
      magnetUrl: link.magnetUrl,
      displayName: link.displayName,
      status: "pending",
      tags: link.displayName ? parseTags(link.displayName) : undefined,
    }));
    setTorrentStatuses(initialStatuses);

    try {
      console.log("🚀 Starting to add torrents:", magnetLinks.length);

      // Update all statuses to "adding"
      setTorrentStatuses(
        initialStatuses.map((status) => ({ ...status, status: "adding" }))
      );

      await addTorrents(
        magnetLinks,
        savePath,
        'tvshow-anime',
        initialStatuses
          .map(status => status.tags)
          .filter((tags): tags is string[] => tags !== undefined)
          .flat()
      );

      // Update all statuses to "success"
      setTorrentStatuses(
        initialStatuses.map((status) => ({ ...status, status: "success" }))
      );
      setStatus({
        type: "success",
        message: `Added ${magnetLinks.length} torrents`,
      });

      setMagnetLinks([]);
      setTorrentStatuses([]);
    } catch (error) {
      console.error("❌ Error:", error);
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to add torrents",
      });
      // Update all statuses to "error" with error message
      setTorrentStatuses(
        initialStatuses.map((status) => ({
          ...status,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (suggestion: SuggestionPill) => {
    const parts = savePath.split('/').filter(Boolean);
    const minParts = 5; // /storage/Library/<library>/<showname>/<season>

    // Ensure we have at least the minimum parts
    while (parts.length < minParts) {
      if (parts.length === 0) parts.push('storage');
      else if (parts.length === 1) parts.push('Library');
      else if (parts.length === 2) parts.push('Temp');
      else if (parts.length === 3) parts.push('Unknown');
      else if (parts.length === 4) parts.push('Season 1');
    }

    // Update the relevant part based on suggestion type
    if (suggestion.type === "library") {
      parts[2] = suggestion.value as string;
    } else if (suggestion.type === "showname") {
      parts[3] = suggestion.value as string;
    } else if (suggestion.type === "season") {
      parts[4] = `Season ${suggestion.value}`;
    }

    // Reconstruct the path
    const newPath = `/${parts.join('/')}/`;
    setSavePath(newPath);
    console.log('📁 Updated save path:', newPath);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-3 sm:p-6">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-xl py-2 font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Bunch of Magnets
        </h1>

        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Logout
        </button>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700"
        >
          <div>
            <label
              htmlFor="savePath"
              className="block text-xs font-medium mb-1 text-gray-300"
            >
              Save Directory
            </label>
            <input
              type="text"
              id="savePath"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="/path/to/save/directory"
              required
            />
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    applySuggestion(suggestion);
                    copyToClipboard(
                      suggestion.type === "season" 
                        ? `Season ${suggestion.value}`
                        : suggestion.value as string
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-2 ${
                    suggestion.type === "season"
                      ? "bg-purple-900/50 text-purple-200 hover:bg-purple-800/50"
                      : suggestion.type === "library"
                      ? "bg-green-900/50 text-green-200 hover:bg-green-800/50"
                      : "bg-blue-900/50 text-blue-200 hover:bg-blue-800/50"
                  }`}
                >
                  <span>
                    {suggestion.type === "season"
                      ? `Season ${suggestion.value}`
                      : suggestion.value}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div>
            <label
              htmlFor="magnetInput"
              className="block text-xs font-medium mb-1 text-gray-300"
            >
              Magnet Links
            </label>
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
              <textarea
                id="magnetInput"
                value={magnetInput}
                onChange={handleMagnetInput}
                className="w-full h-12 p-2 bg-transparent font-mono text-xs text-gray-100 focus:outline-none focus:ring-0 focus:border-0 transition-all resize-none"
                placeholder="Paste magnet link here (magnet:?xt=...) or a website url with a bunch of magnet links."
              />
              {isExtracting && (
                <p className="px-2 text-xs text-blue-400">
                  Extracting magnet links from URL...
                </p>
              )}
              {(magnetLinks.length > 0 || torrentStatuses.length > 0) && (
                <>
                  <div className="h-px bg-gray-700" />
                  <div className="space-y-1">
                    {(torrentStatuses.length > 0
                      ? torrentStatuses
                      : magnetLinks
                    ).map((item, index) => (
                      <div
                        key={index}
                        className="text-xs hover:bg-gray-800 rounded text-gray-200 transition-colors flex items-center group"
                      >
                        <div className="flex-1 min-w-0 flex items-center space-x-2 px-4">
                          <span
                            className="truncate"
                            title={
                              "displayName" in item
                                ? item.displayName
                                : item.magnetUrl
                            }
                          >
                            {"displayName" in item
                              ? item.displayName
                              : item.magnetUrl}
                          </span>
                          {"status" in item && (
                            <span
                              className={`text-xs flex-shrink-0 ${
                                item.status === "success"
                                  ? "text-green-400"
                                  : item.status === "error"
                                  ? "text-red-400"
                                  : item.status === "adding"
                                  ? "text-blue-400"
                                  : "text-gray-400"
                              }`}
                            >
                              {item.status === "success"
                                ? "✓"
                                : item.status === "error"
                                ? "✕"
                                : item.status === "adding"
                                ? "⟳"
                                : "⋯"}
                            </span>
                          )}
                        </div>
                        {!("status" in item) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeMagnetLink(index);
                            }}
                            className="ml-2 px-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-900 rounded text-2xl font-medium hover:bg-gray-800/50"
                            aria-label="Remove magnet link"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {magnetLinks.length > 0 && (
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-3 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl disabled:hover:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              {isLoading
                ? "Adding..."
                : `Add ${magnetLinks.length} Torrents`}
            </button>
          )}
        </form>

        {status && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              status.type === "success"
                ? "bg-green-900/50 text-green-200 border border-green-800"
                : "bg-red-900/50 text-red-200 border border-red-800"
            }`}
          >
            {status.message}
          </div>
        )}

        {qbittorrentUrl && (
          <div className="mt-4 text-center">
            <a
              href={qbittorrentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-blue-400 transition-colors"
            >
              Open qBittorrent Web UI →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
