import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAdmin } from "@/lib/auth-server";
import { GameError } from "@/lib/engine";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const u = await requireUser(req);
    return NextResponse.json(
      {
        uid: u.uid,
        name: u.name || u.email,
        email: u.email,
        admin: isAdmin(u),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof GameError ? e.message : "ติดต่อระบบเข้าสู่ระบบไม่ได้" },
      { status: e instanceof GameError ? e.status : 503 },
    );
  }
}
