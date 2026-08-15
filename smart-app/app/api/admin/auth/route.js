import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSessionCookieValue, ADMIN_COOKIE_NAME } from "../../../../lib/adminSession";

export async function POST(req) {
  const { email, password } = await req.json();
  const validEmail = process.env.SMART_ADMIN_EMAIL || "smartlive@gmail.com";
  const validPassword = process.env.SMART_ADMIN_PASSWORD || "StudentMart26";

  if (email !== validEmail || password !== validPassword) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const value = createAdminSessionCookieValue();
  cookies().set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
