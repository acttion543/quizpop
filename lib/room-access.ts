import type { DecodedIdToken } from "firebase-admin/auth";
import type { Room } from "./types";
import { requireAdmin } from "./auth-server";
import { GameError } from "./engine";

export function pinCheck(pin: unknown): asserts pin is string {
  if (typeof pin !== "string" || !/^\d{6}$/.test(pin))
    throw new GameError("กรอกรหัสห้อง 6 หลัก");
}
export function roomIdentity(room: Room, user: DecodedIdToken, role: string | null) {
  if (role === "host") {
    requireAdmin(user);
    if (room.hostUid === user.uid) return { host: true, playerId: null };
  }
  if (role !== "host" && room.players[user.uid])
    return { host: false, playerId: user.uid };
  throw new GameError("ไม่มีสิทธิ์เข้าห้องนี้ กรุณาเข้าร่วมใหม่", 403);
}
