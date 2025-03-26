"use client";

import { useCallback, useState } from "react";
import { MagnetLink, debounce, parseMagnetLinks, parseTags } from "./utils/magnet";

type TorrentStatus = {
  magnetUrl: string;
  displayName?: string;
  status: "pending" | "adding" | "success" | "error";
  error?: string;
  tags?: string[];
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

  const handleLogout = async () => {
    try {
      console.log('🔒 Logging out...')
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      if (response.ok) {
        window.location.href = '/login'
      } else {
        console.error('❌ Logout failed')
      }
    } catch (error) {
      console.error('❌ Logout error:', error)
      window.location.href = '/login'
    }
  }

  const removeMagnetLink = (index: number) => {
    console.log(`🗑️ Removing magnet link at index ${index}`);
    setMagnetLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMagnetLinks = useCallback(
    debounce((text: string) => {
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
      } else {
        console.log("⚠️ No new unique links found");
      }

      setMagnetInput("");
    }, 150),
    [magnetLinks] // Add magnetLinks as a dependency
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

      const response = await fetch("/api/qbittorrent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          magnetLinks: magnetLinks.map((link) => link.magnetUrl),
          savePath,
          category: 'tvshow-anime',
          tags: initialStatuses.map(status => status.tags).filter(Boolean).flat(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.results?.[0]?.success) {
        throw new Error(data.results?.[0]?.error || data.error || "Failed to add torrents");
      }

      console.log("✅ Added all torrents successfully");

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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-3 sm:p-6">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-xl py-2 font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Bulk Magnet Links
        </h1>

        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Logout
        </button>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-700"
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
                placeholder="magnet:?xt=urn:btih:... or https://..."
              />
              {isExtracting && (
                <p className="px-2 text-xs text-blue-400">
                  Extracting magnet links from URL...
                </p>
              )}
              {(magnetLinks.length > 0 || torrentStatuses.length > 0) && (
                <>
                  <div className="h-px bg-gray-700" />
                  <div className="p-2 space-y-1">
                    {(torrentStatuses.length > 0
                      ? torrentStatuses
                      : magnetLinks
                    ).map((item, index) => (
                      <div
                        key={index}
                        className="text-xs p-1.5 hover:bg-gray-800 rounded text-gray-200 transition-colors flex items-center group"
                      >
                        <div className="flex-1 min-w-0 flex items-center space-x-2">
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
                            onClick={() => removeMagnetLink(index)}
                            className="ml-2 p-0.5 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-900 rounded"
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

          <button
            type="submit"
            disabled={isLoading || magnetLinks.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-3 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl disabled:hover:shadow-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {isLoading
              ? "Adding..."
              : `Add ${magnetLinks.length} Torrents`}
          </button>
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
      </main>
    </div>
  );
}
