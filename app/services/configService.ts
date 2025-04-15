export interface Config {
  qbittorrentUrl: string;
}

export async function fetchConfig(): Promise<Config> {
  try {
    console.log("⚙️ Fetching configuration...");
    const response = await fetch("/api/config");

    if (!response.ok) {
      throw new Error("Failed to fetch configuration");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error fetching configuration:", error);
    throw error;
  }
}
