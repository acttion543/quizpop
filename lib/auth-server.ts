import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { database } from "./store";
import { GameError } from "./engine";
export function isAdmin(user: DecodedIdToken) {
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return (
    !!user.email_verified &&
    !!user.email &&
    allowed.includes(user.email.toLowerCase())
  );
}
export async function requireUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new GameError("กรุณาเข้าสู่ระบบด้วย Google ก่อน", 401);
  database();
  try {
    const user = await getAuth().verifyIdToken(token, true);
    if (!user.email_verified || user.firebase.sign_in_provider !== "google.com")
      throw new Error("Google login required");
    return user;
  } catch {
    throw new GameError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบ Google อีกครั้ง", 401);
  }
}
export function requireAdmin(user: DecodedIdToken) {
  if (!isAdmin(user)) throw new GameError("เฉพาะผู้ดูแลระบบเท่านั้น", 403);
}
