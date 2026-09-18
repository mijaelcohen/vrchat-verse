const BASE_URL = "https://api.vrchat.cloud/api/1";

export interface VRChatClientCookies {
  auth?: string;
  twoFactorAuth?: string;
}

export interface VRChatRequestOptions extends RequestInit {
  /** Attach HTTP Basic Auth (only used for the initial login request). */
  basicAuth?: { username: string; password: string };
}

export interface VRChatResponse<T> {
  status: number;
  data: T;
}

/**
 * Minimal hand-rolled client for VRChat's unofficial API: holds the auth
 * cookie pair, attaches the required User-Agent, and captures Set-Cookie
 * headers as they come back from login/verify calls.
 *
 * Endpoint paths/response shapes here follow community-documented behavior
 * (e.g. vrchatapi.github.io) — verify against real responses during initial
 * local testing with a real service account, since this is an unofficial API.
 */
export class VRChatClient {
  private cookies: VRChatClientCookies;

  constructor(cookies: VRChatClientCookies = {}) {
    this.cookies = { ...cookies };
  }

  getCookies(): VRChatClientCookies {
    return { ...this.cookies };
  }

  private cookieHeader(): string | undefined {
    const pairs = Object.entries(this.cookies).filter(([, v]) => v);
    if (pairs.length === 0) return undefined;
    return pairs.map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private captureCookies(res: Response): void {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const pair = raw.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name === "auth") this.cookies.auth = value;
      if (name === "twoFactorAuth") this.cookies.twoFactorAuth = value;
    }
  }

  async request<T>(path: string, options: VRChatRequestOptions = {}): Promise<VRChatResponse<T>> {
    const { basicAuth, headers: initHeaders, ...init } = options;
    const headers = new Headers(initHeaders);

    const userAgent = process.env.VRCHAT_USER_AGENT;
    if (!userAgent) throw new Error("VRCHAT_USER_AGENT is not set");
    headers.set("User-Agent", userAgent);
    headers.set("Accept", "application/json");

    const cookieHeader = this.cookieHeader();
    if (cookieHeader) headers.set("Cookie", cookieHeader);

    if (basicAuth) {
      const token = Buffer.from(
        `${encodeURIComponent(basicAuth.username)}:${encodeURIComponent(basicAuth.password)}`,
      ).toString("base64");
      headers.set("Authorization", `Basic ${token}`);
    }

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    this.captureCookies(res);

    const data = (await res.json().catch(() => undefined)) as T;
    return { status: res.status, data };
  }
}
