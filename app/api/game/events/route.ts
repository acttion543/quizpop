import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { assertActive, GameError } from "@/lib/engine";
import { database, readRoom } from "@/lib/store";
import { pinCheck, roomIdentity } from "@/lib/room-access";
import { createRoomEventStream } from "@/lib/room-events";
import type { Room } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const pin = req.nextUrl.searchParams.get("pin");
    const role = req.nextUrl.searchParams.get("role");
    pinCheck(pin);
    const room = await readRoom(pin);
    assertActive(room, Date.now());
    roomIdentity(room, user, role);
    const stream = createRoomEventStream({
      initial: room,
      identify: (r) => roomIdentity(r, user, role),
      subscribe: (next, error) => database().collection("quizpopRooms").doc(pin)
        .onSnapshot((doc) => next(doc.exists ? doc.data() as Room : null), error),
      signal: req.signal,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof GameError ? error.message : "เชื่อมต่อห้องสดไม่ได้",
    }, {
      status: error instanceof GameError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
