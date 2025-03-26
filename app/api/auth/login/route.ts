import { NextResponse } from "next/server";

const CORRECT_PASSWORD = process.env.APP_PASSWORD;

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password !== CORRECT_PASSWORD) {
      console.error("❌ Invalid login attempt");
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Set auth cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    console.log("🔐 Successful login");
    return response;
  } catch (error) {
    console.error("❌ Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
