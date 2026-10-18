// Server-only. Renews a Google access token with the same OAuth client
// configured in Supabase Auth → Google. The client secret never reaches the browser.

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
};

export type GoogleRefreshResult =
  | { ok: true; accessToken: string; expiresIn: number; refreshToken?: string }
  | { ok: false; reason: "unconfigured" | "invalid" | "failed" };

export async function exchangeGoogleRefreshToken(refreshToken: string): Promise<GoogleRefreshResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return { ok: false, reason: "unconfigured" };

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!response.ok || !payload?.access_token) {
    return { ok: false, reason: payload?.error === "invalid_grant" ? "invalid" : "failed" };
  }

  return {
    ok: true,
    accessToken: payload.access_token,
    expiresIn: payload.expires_in ?? 3600,
    refreshToken: payload.refresh_token,
  };
}
