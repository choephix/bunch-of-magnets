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

    // Find all href attributes that contain magnet links
    const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/g;
    const matches = [...html.matchAll(magnetRegex)];
    
    const magnetUrls = matches.map(match => match[1]);
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