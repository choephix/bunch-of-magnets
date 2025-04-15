import { MagnetLink } from "../utils/magnet";

export async function parseTvShowName(displayName: string): Promise<string> {
  try {
    const response = await fetch("/api/parse-tv-shows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filenames: [displayName],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to parse TV show name");
    }

    const data = await response.json();
    return data.showNames[0];
  } catch (error) {
    console.error("❌ Error parsing TV show name:", error);
    throw error;
  }
}

export async function parseFirstTvShowName(
  magnetLinks: readonly MagnetLink[],
): Promise<string | null> {
  if (magnetLinks[0]?.displayName) {
    try {
      const showName = await parseTvShowName(magnetLinks[0].displayName);
      console.log("📺 Parsed TV show name:", showName);
      return showName;
    } catch (error) {
      console.error("❌ Error parsing TV show name:", error);
      return null;
    }
  }
  return null;
}

export function parseSeasons(magnetLinks: readonly MagnetLink[]): number[] {
  const seasons = new Set<number>();

  magnetLinks.forEach((link) => {
    if (link.displayName) {
      // Match patterns like S01, S1, Season 1, etc.
      const seasonMatch = link.displayName.match(
        /S(\d{1,2})|Season\s+(\d{1,2})/i,
      );
      if (seasonMatch) {
        const seasonNum = parseInt(seasonMatch[1] || seasonMatch[2], 10);
        if (!isNaN(seasonNum)) {
          seasons.add(seasonNum);
        }
      }
    }
  });

  return Array.from(seasons).sort((a, b) => a - b);
}
