import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { openPendingRegistration, registrationCookieName, verificationCodeHash } from "@/lib/registration-verification";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^\d{6}$/.test(String(code ?? ""))) return NextResponse.json({ error: "6 haneli doğrulama kodunu girin." }, { status: 400 });

    const cookieStore = await cookies();
    const pending = await openPendingRegistration(cookieStore.get(registrationCookieName)?.value);
    if (!pending) return NextResponse.json({ error: "Kodun süresi dolmuş. Yeni bir doğrulama kodu isteyin." }, { status: 410 });
    if (pending.email !== normalizedEmail) return NextResponse.json({ error: "Doğrulama isteği eşleşmiyor." }, { status: 400 });

    const suppliedHash = Buffer.from(verificationCodeHash(normalizedEmail, String(code)), "hex");
    const expectedHash = Buffer.from(pending.codeHash, "hex");
    if (expectedHash.length !== suppliedHash.length || !timingSafeEqual(expectedHash, suppliedHash)) {
      return NextResponse.json({ error: "Doğrulama kodu hatalı." }, { status: 400 });
    }

    if (await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) })) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    const [user] = await db.insert(users).values({
        email: pending.email,
        passwordHash: pending.passwordHash,
        fullName: pending.fullName,
        accountType: pending.accountType,
        organizationName: pending.organizationName,
        useCase: pending.useCase,
      }).returning({ id: users.id });

    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: session.expiresAt, path: "/" });
    response.cookies.set(registrationCookieName, "", { expires: new Date(0), path: "/api/auth/register" });
    return response;
  } catch (error) {
    console.error("E-posta doğrulama hatası:", error);
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    return NextResponse.json({ error: "Doğrulama tamamlanamadı." }, { status: 500 });
  }
}
