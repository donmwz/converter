import { compare } from "bcryptjs";
import { randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSession, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendVerificationEmail } from "@/lib/brevo";
import { loginCodeHash, loginVerificationCookieName, sealPendingLogin } from "@/lib/login-verification";

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

    if (user.emailTwoFactorEnabled) {
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const token = await sealPendingLogin({ userId: user.id, email: user.email, fullName: user.fullName, codeHash: loginCodeHash(user.id, code) });
      await sendVerificationEmail({ email: user.email, name: user.fullName, code, purpose: "login" });
      const response = NextResponse.json({ twoFactorRequired: true, email: user.email });
      response.cookies.set(loginVerificationCookieName, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/api/auth/login" });
      return response;
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
    console.error("Giriş işlemi hatası:", error);
    if (error instanceof Error && /connect|ECONNREFUSED|DATABASE_URL/i.test(error.message)) {
      return databaseError();
    }
    return NextResponse.json({ error: "Giriş işlemi tamamlanamadı." }, { status: 500 });
  }
}
