import { randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { passwordResetCodeHash, passwordResetCookieName, sealPasswordReset } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });

    const user = await db.query.users.findFirst({ where: eq(users.email, normalizedEmail) });
    const response = NextResponse.json({ ok: true, email: normalizedEmail });
    if (!user) return response;

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const token = await sealPasswordReset({ userId: user.id, email: user.email, codeHash: passwordResetCodeHash(user.id, code) });
    await sendVerificationEmail({ email: user.email, name: user.fullName, code, purpose: "password-reset" });
    response.cookies.set(passwordResetCookieName, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/api/auth/password-reset" });
    return response;
  } catch (error) {
    console.error("Şifre sıfırlama isteği başarısız:", error);
    return NextResponse.json({ error: "Şifre sıfırlama e-postası şu anda gönderilemedi." }, { status: 500 });
  }
}
