/**
 * CDSE (Copernicus Data Space Ecosystem) OAuth2 token management.
 * Server-side only — never import this from client code.
 *
 * Uses OAuth2 client credentials flow to obtain access tokens for
 * the Sentinel Hub Processing API on CDSE.
 *
 * Required env vars:
 *   CDSE_CLIENT_ID     — OAuth2 client ID from dataspace.copernicus.eu
 *   CDSE_CLIENT_SECRET — OAuth2 client secret
 */

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

/** Buffer before expiry to proactively refresh (30 seconds) */
const EXPIRY_BUFFER_MS = 30_000;

interface CdseToken {
  access_token: string;
  expires_at: number; // Date.now() + expires_in * 1000
}

let cachedToken: CdseToken | null = null;

/**
 * Get a valid CDSE access token, refreshing if needed.
 * Tokens are cached in-memory and reused until near expiry.
 *
 * @throws {Error} If CDSE credentials are not configured or token fetch fails
 */
export async function getCdseAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expires_at - EXPIRY_BUFFER_MS) {
    return cachedToken.access_token;
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "CDSE credentials not configured. Set CDSE_CLIENT_ID and CDSE_CLIENT_SECRET in .env.local"
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `CDSE token request failed (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

/** Check whether CDSE credentials are configured */
export function isCdseConfigured(): boolean {
  return !!(process.env.CDSE_CLIENT_ID && process.env.CDSE_CLIENT_SECRET);
}
