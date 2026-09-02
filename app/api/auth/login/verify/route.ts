import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, sessionCookieName } from "@/lib/auth";
import { loginCodeHash, loginVerificationCookieName, openPendingLogin } from "@/lib/login-verification";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    if (!/^\d{6}$/.test(String(code ?? ""))) return NextResponse.json({ error: "6 haneli giriş kodunu girin." }, { status: 400 });
    const cookieStore = await cookies();
    const pending = await openPendingLogin(cookieStore.get(loginVerificationCookieName)?.value);
    if (!pending) return NextResponse.json({ error: "Giriş kodunun süresi dolmuş. Yeniden giriş yapın." }, { status: 410 });
    if (typeof email !== "string" || pending.email !== email.trim().toLowerCase()) return NextResponse.json({ error: "Giriş doğrulama isteği eşleşmiyor." }, { status: 400 });
    const supplied = Buffer.from(loginCodeHash(pending.userId, String(code)), "hex");
    const expected = Buffer.from(pending.codeHash, "hex");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ error: "Giriş kodu hatalı." }, { status: 400 });

    const session = await createSession(pending.userId);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: session.expiresAt, path: "/" });
    response.cookies.set(loginVerificationCookieName, "", { expires: new Date(0), path: "/api/auth/login" });
    return response;
  } catch (error) {
    console.error("İki faktörlü giriş doğrulaması başarısız:", error);
    return NextResponse.json({ error: "Giriş doğrulaması tamamlanamadı." }, { status: 500 });
  }
}
