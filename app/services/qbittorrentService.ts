import { MagnetLink } from "../utils/magnet";

export async function addTorrents(
  magnetLinks: readonly MagnetLink[],
  savePath: string,
  category: string,
  tags: string[],
  downloaderName?: string,
): Promise<void> {
  try {
    const response = await fetch("/api/qbittorrent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        magnetLinks: magnetLinks.map((link) => link.magnetUrl),
        savePath,
        category,
        tags,
        downloaderName,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.results?.[0]?.success) {
      throw new Error(
        data.results?.[0]?.error || data.error || "Failed to add torrents",
      );
    }

    console.log("✅ Added all torrents successfully");
  } catch (error) {
    console.error("❌ Error adding torrents:", error);
    throw error;
  }
}
