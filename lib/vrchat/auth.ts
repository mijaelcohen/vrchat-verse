import { createInterface } from "node:readline/promises";
import { Secret, TOTP } from "otpauth";
import { VRChatClient } from "./client";
import { loadCookieJar, saveCookieJar, touchLastVerified } from "./session-store";
import type { VRChatCookieJar, VRChatCurrentUserResponse, VRChatVerify2FAResponse } from "./types";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function generateTotpCode(): string {
  const totp = new TOTP({
    secret: Secret.fromBase32(requiredEnv("VRCHAT_TOTP_SECRET")),
    digits: 6,
    period: 30,
  });
  return totp.generate();
}

/** Prompts on the terminal for the OTP VRChat emails on login. Requires an attended run. */
async function promptEmailOtpCode(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question("Enter the VRChat email OTP code: ")).trim();
  } finally {
    rl.close();
  }
}

/** Fresh login + TOTP verification. Persists the resulting cookie jar. */
async function login(): Promise<VRChatClient> {
  const username = requiredEnv("VRCHAT_USERNAME");
  const password = requiredEnv("VRCHAT_PASSWORD");

  const client = new VRChatClient();
  const loginRes = await client.request<VRChatCurrentUserResponse>("/auth/user", {
    method: "GET",
    basicAuth: { username, password },
  });

  if (loginRes.status !== 200) {
    throw new Error(`VRChat login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
  }

  const factors = loginRes.data.requiresTwoFactorAuth ?? [];

  if (factors.includes("totp")) {
    const verifyRes = await client.request<VRChatVerify2FAResponse>("/auth/twofactorauth/totp/verify", {
      method: "POST",
      body: JSON.stringify({ code: generateTotpCode() }),
    });
    if (verifyRes.status !== 200 || !verifyRes.data.verified) {
      throw new Error(`VRChat TOTP verification failed with status ${verifyRes.status}`);
    }
  } else if (factors.includes("emailOtp")) {
    const code = await promptEmailOtpCode();
    const verifyRes = await client.request<VRChatVerify2FAResponse>("/auth/twofactorauth/emailotp/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (verifyRes.status !== 200 || !verifyRes.data.verified) {
      throw new Error(`VRChat email OTP verification failed with status ${verifyRes.status}`);
    }
  } else if (factors.length > 0) {
    throw new Error(`VRChat requires unsupported 2FA method(s): ${factors.join(", ")}`);
  }

  const jar: VRChatCookieJar = { ...client.getCookies(), capturedAt: new Date().toISOString() };
  await saveCookieJar(username, jar);
  return client;
}

/**
 * Returns a `VRChatClient` with a valid session, reusing the persisted cookie
 * jar when possible (one cheap verification call) and falling back to a
 * fresh login + TOTP verification otherwise.
 */
export async function getValidSession(): Promise<VRChatClient> {
  const username = requiredEnv("VRCHAT_USERNAME");

  const jar = await loadCookieJar(username);
  if (!jar) {
    return login();
  }

  const client = new VRChatClient({ auth: jar.auth, twoFactorAuth: jar.twoFactorAuth });
  const check = await client.request<VRChatCurrentUserResponse>("/auth/user", { method: "GET" });

  if (check.status === 200 && !check.data.requiresTwoFactorAuth?.length) {
    await touchLastVerified(username);
    return client;
  }

  return login();
}
