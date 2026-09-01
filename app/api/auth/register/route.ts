import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const databaseError = () =>
  NextResponse.json(
    { error: "Veritabanına bağlanılamadı. Postgres servisinin çalıştığından emin olun." },
    { status: 503 },
  );

export async function POST(request: Request) {
  try {
    const { email, password, fullName, accountType, organizationName, useCase } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const validAccountTypes = ["individual", "corporate", "student"];

    if (
      !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
      typeof password !== "string" ||
      password.length < 8 ||
      typeof fullName !== "string" ||
      !fullName.trim() ||
      !validAccountTypes.includes(accountType) ||
      typeof useCase !== "string" ||
      !useCase
    ) {
      return NextResponse.json({ error: "Lütfen tüm zorunlu alanları doldurun." }, { status: 400 });
    }

    if (
      ["corporate", "student"].includes(accountType) &&
      (typeof organizationName !== "string" || !organizationName.trim())
    ) {
      return NextResponse.json(
        { error: accountType === "corporate" ? "Şirket adı zorunludur." : "Okul adı zorunludur." },
        { status: 400 },
      );
    }

    if (await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) })) {
      return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 });
    }

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash: await hash(password, 12),
        fullName: fullName.trim(),
        accountType,
        organizationName:
          typeof organizationName === "string" && organizationName.trim() ? organizationName.trim() : null,
        useCase,
      })
      .returning({ id: users.id });

    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.expiresAt,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Kayıt işlemi hatası:", error);
    if (error instanceof Error && /connect|ECONNREFUSED|DATABASE_URL/i.test(error.message)) {
      return databaseError();
    }
    return NextResponse.json({ error: "Kayıt işlemi tamamlanamadı." }, { status: 500 });
  }
}
