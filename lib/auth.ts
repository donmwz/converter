import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

export const sessionCookieName = "convertly_session";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function getSessionUserId(token: string | undefined) {
  if (!token) return null;
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())),
  });
  return session?.userId ?? null;
}
