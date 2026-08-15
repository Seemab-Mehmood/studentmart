import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "smart_admin_session";

function sign(value) {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret-change-me";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function createAdminSessionCookieValue() {
  const payload = `admin:${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(cookieValue) {
  if (!cookieValue) return false;
  const [payload, sig] = cookieValue.split(".");
  if (!payload || !sig) return false;
  return sign(payload) === sig;
}

export function isAdminRequest() {
  const store = cookies();
  const val = store.get(COOKIE_NAME)?.value;
  return isValidAdminSession(val);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
