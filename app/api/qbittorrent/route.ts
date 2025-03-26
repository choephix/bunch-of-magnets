import { NextResponse } from "next/server";

const QBITTORRENT_URL = process.env.QBITTORRENT_URL;
const QBITTORRENT_USERNAME = process.env.QBITTORRENT_USERNAME;
const QBITTORRENT_PASSWORD = process.env.QBITTORRENT_PASSWORD;

if (!QBITTORRENT_URL || !QBITTORRENT_USERNAME || !QBITTORRENT_PASSWORD) {
  throw new Error("Missing required qBittorrent environment variables");
}

async function login() {
  const response = await fetch(
    `${QBITTORRENT_URL}/api/v2/auth/login?username=${QBITTORRENT_USERNAME}&password=${QBITTORRENT_PASSWORD}`
  );
  if (!response.ok) {
    throw new Error("Failed to login to qBittorrent");
  }
  return response.headers.get("set-cookie");
}

export async function POST(request: Request) {
  try {
    const { magnetLinks, savePath, category, tags } = await request.json();

    if (!Array.isArray(magnetLinks) || !savePath) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const cookie = await login();
    if (!cookie) {
      return NextResponse.json(
        { error: "Failed to authenticate with qBittorrent" },
        { status: 401 }
      );
    }

    const allMagnetLinks = magnetLinks.join("\n");
    console.log("📥 Adding torrent(s) with URLs:", allMagnetLinks);
    console.log("📁 Using save path:", savePath);
    console.log("🏷️ Using category:", category);
    console.log("🏷️ Using tags:", tags);

    const headers = {
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const bodyDict = {
      urls: allMagnetLinks,
      savepath: savePath,
      category: category,
      autoTMM: "false",
      tags: Array.isArray(tags) ? tags.join(",") : "",
    };
    const body = new URLSearchParams(bodyDict);
    console.log("🔍 Body:", body.toString());

    const response = await fetch(`${QBITTORRENT_URL}/api/v2/torrents/add`, {
      method: "POST",
      headers: headers,
      body: body,
    });

    const responseText = await response.text();
    if (!response.ok || responseText.startsWith("Fail")) {
      console.error("❌ qBittorrent API error:", responseText);
      return NextResponse.json({
        results: [{ success: false, error: responseText }],
      });
    }

    return NextResponse.json({
      results: [{ success: true, data: responseText }],
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
