import { NextResponse } from "next/server";
import { parseMagnetLinks } from "@/app/utils/magnet";

const TORRENT_PATHS = ["/torrent", "/download"]; // Add more paths as needed

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log("🌐 Fetching URL:", url);
    const response = await fetch(url);
    
    let magnetUrls: string[] = [];

    // Clone the response so we can try both JSON and text parsing
    const responseClone = response.clone();

    // Try to parse as JSON first
    try {
      const json = await response.json();
      console.log("📦 Detected JSON response");
      magnetUrls = await handleUserJsonUrl(json);
    } catch (jsonError) {
      // If JSON parsing fails, treat as HTML/text
      console.log("📄 Treating response as HTML/text");
      const html = await responseClone.text();
      magnetUrls = await handleUserHtmlUrl(url, html);
    }

    const magnetLinks = parseMagnetLinks(magnetUrls.join("\n"));
    console.log("🔍 Found magnet links:", magnetLinks.length);

    return NextResponse.json({ magnetLinks });
  } catch (error) {
    console.error("❌ Error extracting magnet links:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract magnet links",
      },
      { status: 500 },
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
  const urls = matches.map((match) => match[1]);
  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls;
}

/**
 * Recursively extracts magnet URLs from a JSON object
 * @param obj - The JSON object to search
 * @returns Array of magnet URLs found in the JSON
 */
function extractMagnetUrlsFromJson(obj: any): string[] {
  const magnetUrls: string[] = [];
  const magnetRegex = /magnet:\?xt=urn:btih:[^"]+/g;

  function traverse(current: any) {
    if (typeof current === "string") {
      const matches = current.match(magnetRegex);
      if (matches) {
        magnetUrls.push(...matches);
      }
    } else if (Array.isArray(current)) {
      current.forEach(traverse);
    } else if (typeof current === "object" && current !== null) {
      Object.values(current).forEach(traverse);
    }
  }

  traverse(obj);
  return [...new Set(magnetUrls)];
}

/**
 * Recursively extracts HTTP(S) URLs from a JSON object
 * @param obj - The JSON object to search
 * @returns Array of HTTP(S) URLs found in the JSON
 */
function extractHttpUrlsFromJson(obj: any): string[] {
  const httpUrls: string[] = [];
  const httpRegex = /https?:\/\/[^\s"']+/g;

  function traverse(current: any) {
    if (typeof current === "string") {
      const matches = current.match(httpRegex);
      if (matches) {
        httpUrls.push(...matches);
      }
    } else if (Array.isArray(current)) {
      current.forEach(traverse);
    } else if (typeof current === "object" && current !== null) {
      Object.values(current).forEach(traverse);
    }
  }

  traverse(obj);
  return [...new Set(httpUrls)];
}

/**
 * Handles a JSON response from the user's URL
 * @param json - The JSON object to process
 * @returns Array of magnet URLs found
 */
async function handleUserJsonUrl(json: any): Promise<string[]> {
  console.log("📦 Processing JSON response");
  let magnetUrls = extractMagnetUrlsFromJson(json);

  if (magnetUrls.length === 0) {
    console.log("🔍 No direct magnet links found in JSON, searching for HTTP URLs...");
    const httpUrls = extractHttpUrlsFromJson(json);
    console.log("🔗 Found HTTP URLs:", httpUrls.length);
    magnetUrls = await extractMagnetLinksFromAllHtmlUrls(httpUrls);
  }

  return magnetUrls;
}

/**
 * Handles an HTML response from the user's URL
 * @param url - The original URL
 * @param html - The HTML content
 * @returns Array of magnet URLs found
 */
async function handleUserHtmlUrl(url: string, html: string): Promise<string[]> {
  let magnetUrls = extractMagnetUrls(html);

  if (magnetUrls.length === 0) {
    console.log("🔍 No direct magnet links found, performing deeper search...");
    magnetUrls = await performDeeperSearchOnHTML(url, html);
  }

  return magnetUrls;
}

/**
 * Performs a deeper search on HTML content by following torrent page links
 */
async function performDeeperSearchOnHTML(
  originalUrl: string,
  html: string,
): Promise<string[]> {
  const originalUrlObj = new URL(originalUrl);
  const baseUrl = `${originalUrlObj.protocol}//${originalUrlObj.host}`;

  // Extract all href URLs
  const hrefRegex = /href="([^"]+)"/g;
  const hrefMatches = [...html.matchAll(hrefRegex)];
  const allUrls = hrefMatches.map((match) => match[1]);

  return extractMagnetLinksFromAllHtmlUrls(allUrls, baseUrl, originalUrlObj.host);
}

/**
 * Extracts magnet links from a list of HTML URLs
 * @param urls - List of URLs to process
 * @param baseUrl - Base URL for resolving relative URLs
 * @param originalHost - Original host for filtering
 * @returns Array of magnet URLs found
 */
async function extractMagnetLinksFromAllHtmlUrls(
  urls: string[],
  baseUrl?: string,
  originalHost?: string,
): Promise<string[]> {
  // Filter URLs by same host and torrent paths
  const torrentUrls = urls
    .map((href) => {
      try {
        // Handle relative URLs if baseUrl is provided
        const absoluteUrl = baseUrl ? new URL(href, baseUrl) : new URL(href);
        return absoluteUrl.toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => {
      if (!url) return false;
      try {
        const urlObj = new URL(url);
        return (
          !originalHost || // If no originalHost provided, accept all URLs
          (urlObj.host === originalHost &&
            TORRENT_PATHS.some((path) => urlObj.pathname.startsWith(path)))
        );
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
