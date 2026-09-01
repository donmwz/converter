import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUserId, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversions } from "@/lib/db/schema";

async function currentUserId() {
  const cookieStore = await cookies();
  return getSessionUserId(cookieStore.get(sessionCookieName)?.value);
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { sourceName, sourceFormat, outputFormat, privacyMode } = await request.json();
  if (typeof sourceName !== "string" || !sourceName.trim()) {
    return NextResponse.json({ error: "Dosya adı gerekli." }, { status: 400 });
  }

  const [conversion] = await db.insert(conversions).values({
    userId,
    sourceName: sourceName.trim(),
    sourceKey: `metadata:${crypto.randomUUID()}`,
    status: "uploaded",
    privacyMode: Boolean(privacyMode),
    options: { sourceFormat, outputFormat },
  }).returning({ id: conversions.id });

  return NextResponse.json({ id: conversion.id });
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const history = await db.query.conversions.findMany({
    where: eq(conversions.userId, userId),
    orderBy: [desc(conversions.createdAt)],
    columns: {
      id: true,
      sourceName: true,
      resultName: true,
      status: true,
      options: true,
      uploadedAt: true,
      convertedAt: true,
      createdAt: true,
      resultKey: true,
    },
  });

  return NextResponse.json(history.map(({ resultKey, ...item }) => ({ ...item, downloadable: Boolean(resultKey) })));
}

export async function PATCH(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { id, resultName } = await request.json();
  if (typeof id !== "string" || typeof resultName !== "string" || !resultName.trim()) {
    return NextResponse.json({ error: "Dönüşüm bilgisi eksik." }, { status: 400 });
  }

  const [conversion] = await db.update(conversions).set({
    resultName: resultName.trim(),
    status: "completed",
    convertedAt: new Date(),
  }).where(and(eq(conversions.id, id), eq(conversions.userId, userId))).returning({ id: conversions.id });

  if (!conversion) return NextResponse.json({ error: "Dönüşüm kaydı bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
