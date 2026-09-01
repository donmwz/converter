import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession, sessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) await deleteSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, "", { expires: new Date(0), path: "/" });
  return response;
}
