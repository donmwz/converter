import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser, sessionCookieName } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function currentUser() {
  const cookieStore = await cookies();
  return getCurrentUser(cookieStore.get(sessionCookieName)?.value);
}

export async function GET() {
  const user = await currentUser();
  return user ? NextResponse.json(user) : NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { fullName, organizationName, useCase, emailTwoFactorEnabled } = await request.json();
  if (typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "Ad soyad zorunludur." }, { status: 400 });
  }
  const [updated] = await db.update(users).set({
    fullName: fullName.trim(),
    organizationName: typeof organizationName === "string" && organizationName.trim() ? organizationName.trim() : null,
    useCase: typeof useCase === "string" && useCase ? useCase : user.useCase,
    emailTwoFactorEnabled: typeof emailTwoFactorEnabled === "boolean" ? emailTwoFactorEnabled : user.emailTwoFactorEnabled,
  }).where(eq(users.id, user.id)).returning({
    fullName: users.fullName,
    organizationName: users.organizationName,
    useCase: users.useCase,
    emailTwoFactorEnabled: users.emailTwoFactorEnabled,
  });
  return NextResponse.json(updated);
}
