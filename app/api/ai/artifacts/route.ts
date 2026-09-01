import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversions } from "@/lib/db/schema";
import { storeResult } from "@/lib/storage";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = await getSessionUserId(cookieStore.get(sessionCookieName)?.value);
  if (!userId) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const data = await request.formData();
  const file = data.get("file");
  const sourceName = data.get("sourceName");
  if (!(file instanceof File) || typeof sourceName !== "string" || file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Geçersiz AI çıktı dosyası." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `users/${userId}/ai/${id}/${safeName}`;
  await storeResult(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream", userId);
  await db.insert(conversions).values({
    id,
    userId,
    sourceName,
    sourceKey: `metadata:${crypto.randomUUID()}`,
    resultName: file.name,
    resultKey: key,
    status: "completed",
    options: {
      kind: "ai",
      action: String(data.get("action") ?? "summary"),
      sourceFormat: String(data.get("sourceFormat") ?? ""),
      outputFormat: String(data.get("outputFormat") ?? ""),
    },
    convertedAt: new Date(),
  });
  return NextResponse.json({ id });
}
