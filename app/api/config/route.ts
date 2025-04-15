import { NextResponse } from "next/server";

export async function GET() {
  const QBITTORRENT_URL = process.env.QBITTORRENT_URL;

  if (!QBITTORRENT_URL) {
    return NextResponse.json(
      { error: "Missing qBittorrent URL configuration" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    qbittorrentUrl: QBITTORRENT_URL,
  });
}
