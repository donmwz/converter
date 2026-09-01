import { compare } from "bcryptjs";
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
    const { email, password } = await request.json();
    const user =
      typeof email === "string"
        ? await db.query.users.findFirst({ where: eq(users.email, email.trim().toLowerCase()) })
        : null;

    if (!user || typeof password !== "string" || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

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
    if (error instanceof Error && /connect|ECONNREFUSED|DATABASE_URL/i.test(error.message)) {
      return databaseError();
    }
    return NextResponse.json({ error: "Giriş işlemi tamamlanamadı." }, { status: 500 });
  }
}
