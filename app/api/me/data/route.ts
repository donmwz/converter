import { desc, eq } from "drizzle-orm";
import JSZip from "jszip";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversions, users } from "@/lib/db/schema";
import { deleteStoredResults, getStoredResult } from "@/lib/storage";

async function context() {
  const cookieStore = await cookies();
  return { cookieStore, user: await getCurrentUser(cookieStore.get(sessionCookieName)?.value) };
}

export async function GET() {
  const { user } = await context();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const history = await db.query.conversions.findMany({
    where: eq(conversions.userId, user.id),
    orderBy: [desc(conversions.createdAt)],
  });
  const zip = new JSZip();
  zip.file("hesap.json", JSON.stringify({ ...user, exportedAt: new Date().toISOString() }, null, 2));
  const safeHistory = history.map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== "resultKey" && key !== "sourceKey")));
  zip.file("donusum-gecmisi.json", JSON.stringify(safeHistory, null, 2));
  const usedNames = new Set<string>();
  for (const item of history) {
    if (!item.resultKey || !item.resultName) continue;
    try {
      const stored = await getStoredResult(item.resultKey, user.id);
      let name = item.resultName.replace(/[\\/:*?"<>|]/g, "_");
      if (usedNames.has(name)) name = `${item.id}-${name}`;
      usedNames.add(name);
      zip.file(`dosyalar/${name}`, stored.bytes);
    } catch {
      // Export remains usable if an old or externally removed object is unavailable.
    }
  }
  const archive = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const archiveBuffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
  return new Response(archiveBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="convertly-verilerim-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(request: Request) {
  const { cookieStore, user } = await context();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.scope !== "data" && body?.scope !== "account") {
    return NextResponse.json({ error: "Geçersiz silme kapsamı." }, { status: 400 });
  }
  const history = await db.query.conversions.findMany({
    where: eq(conversions.userId, user.id),
    columns: { resultKey: true },
  });
  await deleteStoredResults(history.flatMap((item) => item.resultKey ? [item.resultKey] : []));
  if (body.scope === "account") {
    await db.delete(users).where(eq(users.id, user.id));
    cookieStore.delete(sessionCookieName);
  } else {
    await db.delete(conversions).where(eq(conversions.userId, user.id));
  }
  return NextResponse.json({ ok: true });
}
