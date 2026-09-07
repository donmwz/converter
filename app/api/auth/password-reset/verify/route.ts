import { hash } from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { openPasswordReset, passwordResetCodeHash, passwordResetCookieName } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const { email, code, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!/^\d{6}$/.test(String(code ?? ""))) return NextResponse.json({ error: "6 haneli doğrulama kodunu girin." }, { status: 400 });
    if (typeof password !== "string" || password.length < 8) return NextResponse.json({ error: "Yeni şifre en az 8 karakter olmalıdır." }, { status: 400 });

    const cookieStore = await cookies();
    const pending = await openPasswordReset(cookieStore.get(passwordResetCookieName)?.value);
    if (!pending) return NextResponse.json({ error: "Kodun süresi dolmuş. Yeni bir kod isteyin." }, { status: 410 });
    if (pending.email !== normalizedEmail) return NextResponse.json({ error: "Şifre sıfırlama isteği eşleşmiyor." }, { status: 400 });

    const supplied = Buffer.from(passwordResetCodeHash(pending.userId, String(code)), "hex");
    const expected = Buffer.from(pending.codeHash, "hex");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: "Doğrulama kodu hatalı." }, { status: 400 });

    await db.transaction(async (transaction) => {
      await transaction.update(users).set({ passwordHash: await hash(password, 12) }).where(eq(users.id, pending.userId));
      await transaction.delete(sessions).where(eq(sessions.userId, pending.userId));
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(passwordResetCookieName, "", { expires: new Date(0), path: "/api/auth/password-reset" });
    return response;
  } catch (error) {
    console.error("Şifre sıfırlama doğrulaması başarısız:", error);
    return NextResponse.json({ error: "Şifre değiştirilemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
