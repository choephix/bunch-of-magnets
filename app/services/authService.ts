export interface AuthResponse {
  success: boolean;
  error?: string;
}

export async function login(password: string): Promise<AuthResponse> {
  try {
    console.log("🔑 Attempting login...");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      return { success: false, error: "Invalid password" };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

export async function checkAuth(): Promise<boolean> {
  try {
    console.log("🔍 Checking authentication status...");
    const response = await fetch("/api/auth/check");
    return response.ok;
  } catch (error) {
    console.error("❌ Auth check error:", error);
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    console.log("🔒 Logging out...");
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }

    window.location.href = "/login";
  } catch (error) {
    console.error("❌ Logout error:", error);
    window.location.href = "/login";
  }
}

export function redirectToLogin(from?: string): void {
  const redirectUrl = from
    ? `/login?from=${encodeURIComponent(from)}`
    : "/login";
  window.location.href = redirectUrl;
}
