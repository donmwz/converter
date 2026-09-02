import "server-only";
import { EncryptJWT, jwtDecrypt } from "jose";
import { createHash } from "crypto";

export const registrationCookieName = "convertly_pending_registration";
export type PendingRegistration = { email: string; passwordHash: string; fullName: string; accountType: string; organizationName: string | null; useCase: string; codeHash: string };

function encryptionKey() {
  const raw = process.env.FILE_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("FILE_ENCRYPTION_KEY tanımlanmadı.");
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FILE_ENCRYPTION_KEY 32 bayt olmalıdır.");
  return key;
}

export const verificationCodeHash = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");

export async function sealPendingRegistration(data: PendingRegistration) {
  return new EncryptJWT(data).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt().setExpirationTime("10m").encrypt(encryptionKey());
}

export async function openPendingRegistration(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, encryptionKey());
    return payload as unknown as PendingRegistration;
  } catch { return null; }
}
