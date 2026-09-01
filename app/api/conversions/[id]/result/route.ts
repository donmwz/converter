import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversions } from "@/lib/db/schema";
import { getStoredResult, storeResult } from "@/lib/storage";

async function userId() {
  const cookieStore = await cookies();
  return getSessionUserId(cookieStore.get(sessionCookieName)?.value);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await userId();
  if (!ownerId) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { id } = await params;
  const conversion = await db.query.conversions.findFirst({
    where: and(eq(conversions.id, id), eq(conversions.userId, ownerId)),
  });
  if (!conversion) return NextResponse.json({ error: "Dönüşüm bulunamadı." }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Geçersiz veya çok büyük sonuç dosyası." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `users/${ownerId}/conversions/${id}/${safeName}`;
  await storeResult(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");
  await db.update(conversions).set({
    resultName: file.name,
    resultKey: key,
    status: "completed",
    convertedAt: new Date(),
  }).where(and(eq(conversions.id, id), eq(conversions.userId, ownerId)));

  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerId = await userId();
  if (!ownerId) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await params;
  const conversion = await db.query.conversions.findFirst({
    where: and(eq(conversions.id, id), eq(conversions.userId, ownerId)),
  });
  if (!conversion?.resultKey || !conversion.resultName) {
    return NextResponse.json({ error: "İndirilebilir dosya bulunamadı." }, { status: 404 });
  }

  const object = await getStoredResult(conversion.resultKey);
  if (!object.Body) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  const bytes = await object.Body.transformToByteArray();
  const encodedName = encodeURIComponent(conversion.resultName);
  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
