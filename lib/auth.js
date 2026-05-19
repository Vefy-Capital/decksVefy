import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "vefy_admin";

function secret() {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "local-dev-secret";
}

export function isAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function signAdminCookie() {
  const timestamp = String(Date.now());
  const signature = crypto
    .createHmac("sha256", secret())
    .update(`admin:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyAdminCookie(value) {
  if (!isAuthConfigured()) return true;
  if (!value || !value.includes(".")) return false;

  const [timestamp, signature] = value.split(".");
  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age) || age > 1000 * 60 * 60 * 24 * 14) return false;

  const expected = crypto
    .createHmac("sha256", secret())
    .update(`admin:${timestamp}`)
    .digest("hex");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function isAdminRequest() {
  const store = await cookies();
  return verifyAdminCookie(store.get(COOKIE_NAME)?.value);
}

export async function requireAdmin() {
  if (await isAdminRequest()) return;
  const error = new Error("Unauthorized");
  error.status = 401;
  throw error;
}

export function adminCookieName() {
  return COOKIE_NAME;
}
