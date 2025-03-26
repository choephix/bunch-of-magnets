import { NextResponse } from "next/server";
import { parseMagnetLinks } from "@/app/utils/magnet";

const TORRENT_PATHS = ["/torrent", "/download"]; // Add more paths as needed

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

    let magnetUrls = extractMagnetUrls(html);
    
    if (magnetUrls.length === 0) {
      console.log("🔍 No direct magnet links found, performing deeper search...");
      magnetUrls = await performDeeperSearch(url, html);
    }

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
  const urls = matches.map(match => match[1]);
  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls;
}

/**
 * Performs a deeper search for magnet links by following torrent page links
 */
async function performDeeperSearch(originalUrl: string, html: string): Promise<string[]> {
  const originalUrlObj = new URL(originalUrl);
  const baseUrl = `${originalUrlObj.protocol}//${originalUrlObj.host}`;
  
  // Extract all href URLs
  const hrefRegex = /href="([^"]+)"/g;
  const hrefMatches = [...html.matchAll(hrefRegex)];
  const allUrls = hrefMatches.map(match => match[1]);
  
  // Filter URLs by same host and torrent paths
  const torrentUrls = allUrls
    .map(href => {
      try {
        // Handle relative URLs
        const absoluteUrl = new URL(href, baseUrl);
        return absoluteUrl.toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => {
      if (!url) return false;
      try {
        const urlObj = new URL(url);
        return urlObj.host === originalUrlObj.host && 
               TORRENT_PATHS.some(path => urlObj.pathname.startsWith(path));
      } catch {
        return false;
      }
    });

  console.log("🔗 Found potential torrent pages:", torrentUrls.length);
  
  // Fetch all torrent pages in parallel
  const magnetPromises = torrentUrls.map(async (url) => {
    try {
      console.log("📥 Fetching torrent page:", url);
      const response = await fetch(url);
      const pageHtml = await response.text();
      const magnets = extractMagnetUrls(pageHtml);
      
      if (magnets.length > 1) {
        console.warn("⚠️ Multiple magnet links found on page:", magnets);
      }
      
      return magnets[0]; // Take first magnet link if any
    } catch (error) {
      console.error("❌ Error fetching torrent page:", url, error);
      return null;
    }
  });

  const results = await Promise.all(magnetPromises);
  return results.filter((magnet): magnet is string => magnet !== null);
} 