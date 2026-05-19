import { NextResponse } from "next/server";
import { adminCookieName, signAdminCookie } from "../../../lib/auth";

export async function POST(request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");

  if (process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(adminCookieName(), signAdminCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });

  return response;
}
