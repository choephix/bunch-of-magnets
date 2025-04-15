import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("auth");
    const isAuthenticated = authCookie?.value === "true";

    if (!isAuthenticated) {
      console.log("🔒 User not authenticated");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    console.log("🔐 User authenticated");
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("❌ Auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
