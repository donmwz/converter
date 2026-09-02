import "server-only";
import { createHash } from "crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

export const loginVerificationCookieName = "convertly_pending_login";
type PendingLogin = { userId: string; email: string; fullName: string; codeHash: string };

function encryptionKey() {
  const raw = process.env.FILE_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("FILE_ENCRYPTION_KEY tanımlanmadı.");
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FILE_ENCRYPTION_KEY 32 bayt olmalıdır.");
  return key;
}

export const loginCodeHash = (userId: string, code: string) => createHash("sha256").update(`${userId}:${code}`).digest("hex");

export async function sealPendingLogin(data: PendingLogin) {
  return new EncryptJWT(data).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt().setExpirationTime("10m").encrypt(encryptionKey());
}

export async function openPendingLogin(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, encryptionKey());
    return payload as unknown as PendingLogin;
  } catch { return null; }
}
