import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { decrypt, encrypt, type EncryptedPayload } from "@/lib/crypto";
import type { VRChatCookieJar } from "./types";

export async function loadCookieJar(account: string): Promise<VRChatCookieJar | null> {
  const row = await prisma.vrchatSyncSession.findUnique({ where: { account } });
  if (!row) return null;
  return JSON.parse(decrypt(row.encryptedCookieJar as unknown as EncryptedPayload)) as VRChatCookieJar;
}

export async function saveCookieJar(account: string, jar: VRChatCookieJar): Promise<void> {
  const encrypted = encrypt(JSON.stringify(jar)) as unknown as Prisma.InputJsonValue;
  await prisma.vrchatSyncSession.upsert({
    where: { account },
    create: { account, encryptedCookieJar: encrypted, lastVerifiedAt: new Date() },
    update: { encryptedCookieJar: encrypted, lastVerifiedAt: new Date() },
  });
}

export async function touchLastVerified(account: string): Promise<void> {
  await prisma.vrchatSyncSession.update({
    where: { account },
    data: { lastVerifiedAt: new Date() },
  });
}
