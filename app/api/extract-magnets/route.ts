import { NextResponse } from "next/server";
import { parseMagnetLinks } from "@/app/utils/magnet";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    console.log("🌐 Fetching URL:", url);
    const response = await fetch(url);
    const html = await response.text();

    const magnetUrls = extractMagnetUrls(html);
    const magnetLinks = parseMagnetLinks(magnetUrls.join("\n"));

    console.log("🔍 Found magnet links:", magnetLinks.length);
    
    return NextResponse.json({ magnetLinks });
  } catch (error) {
    console.error("❌ Error extracting magnet links:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract magnet links" },
      { status: 500 }
    );
  }
}

/**
 * Extracts magnet URLs from an HTML string using regex pattern matching
 * @param html - The HTML string to search for magnet URLs
 * @returns Array of magnet URLs found in the HTML
 */
function extractMagnetUrls(html: string): string[] {
  const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/g;
  const matches = [...html.matchAll(magnetRegex)];
  return matches.map(match => match[1]);
} 