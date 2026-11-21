import { createHash, randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  addPlayer,
  advance,
  assertActive,
  GameError,
  publicRoom,
  settle,
  submitAnswer,
  validateQuestions,
} from "@/lib/engine";
import {
  createRoom,
  database,
  isConfigured,
  mutateRoom,
  rateLimit,
  readRoom,
} from "@/lib/store";
import { requireUser, requireAdmin } from "@/lib/auth-server";
import { avatars, quizzes } from "@/lib/quizzes";
import type { Room } from "@/lib/types";
import type { DecodedIdToken } from "firebase-admin/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
function pinCheck(pin: unknown): asserts pin is string {
  if (typeof pin !== "string" || !/^\d{6}$/.test(pin))
    throw new GameError("กรอกรหัสห้อง 6 หลัก");
}
function identity(room: Room, user: DecodedIdToken, role: string | null) {
  if (role === "host") {
    requireAdmin(user);
    if (room.hostUid === user.uid) return { host: true, playerId: null };
  }
  if (role !== "host" && room.players[user.uid])
    return { host: false, playerId: user.uid };
  throw new GameError("ไม่มีสิทธิ์เข้าห้องนี้ กรุณาเข้าร่วมใหม่", 403);
}
function response(d: unknown) {
  return NextResponse.json(d, { headers: { "Cache-Control": "no-store" } });
}
function failure(e: unknown) {
  if (e instanceof GameError)
    return NextResponse.json(
      { error: e.message },
      { status: e.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "Game backend failure",
    e instanceof Error ? e.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "ติดต่อฐานข้อมูลไม่ได้ กรุณาลองอีกครั้งหรือตรวจการตั้งค่า Firebase" },
    { status: 503 },
  );
}
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get("status") === "1")
      return response({ configured: isConfigured() });
    const user = await requireUser(req);
    if (req.nextUrl.searchParams.get("lobbies") === "1") {
      const docs = await database()
        .collection("quizpopRooms")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
      const now = Date.now();
      return response({
        rooms: docs.docs
          .map((d) => d.data() as Room)
          .filter(
            (r) =>
              r.expiresAt > now &&
              (r.phase === "lobby" ||
                r.players[user.uid] ||
                r.hostUid === user.uid),
          )
          .map((r) => ({
            pin: r.pin,
            title: r.title,
            phase: r.phase,
            count: Object.keys(r.players).length,
            total: r.questions.length,
            joined: !!r.players[user.uid],
            owned: r.hostUid === user.uid,
          })),
      });
    }
    if (req.nextUrl.searchParams.get("quizzes") === "1") {
      requireAdmin(user);
      const docs = await database()
        .collection("quizpopQuizzes")
        .orderBy("updatedAt", "desc")
        .limit(100)
        .get();
      return response({
        catalog: quizzes,
        quizzes: docs.docs.map((d) => d.data().quiz),
      });
    }
    const pin = req.nextUrl.searchParams.get("pin");
    pinCheck(pin);
    const room = await readRoom(pin);
    const now = Date.now();
    assertActive(room, now);
    const who = identity(room, user, req.nextUrl.searchParams.get("role"));
    return response(publicRoom(room, who.host, who.playerId, now));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      throw new GameError("ไม่อนุญาตคำขอจากเว็บไซต์อื่น", 403);
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new GameError("รูปแบบคำขอไม่ถูกต้อง", 415);
    const user = await requireUser(req);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 65536)
      throw new GameError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new GameError("ข้อมูลไม่ถูกต้อง");
    }
    if (!data || typeof data !== "object") throw new GameError("ข้อมูลไม่ถูกต้อง");
    if (data.action === "saveQuiz" || data.action === "deleteQuiz") {
      requireAdmin(user);
      const q = data.quiz;
      if (
        !q ||
        typeof q.id !== "string" ||
        !/^custom-[a-zA-Z0-9-]{1,60}$/.test(q.id)
      )
        throw new GameError("รหัสควิซไม่ถูกต้อง");
      const ref = database().collection("quizpopQuizzes").doc(q.id);
      if (data.action === "deleteQuiz") await ref.delete();
      else {
        if (
          typeof q.title !== "string" ||
          !q.title.trim() ||
          q.title.length > 100
        )
          throw new GameError("ตั้งชื่อควิซ 1–100 ตัวอักษร");
        const quiz = {
          id: q.id,
          title: q.title.trim(),
          description:
            typeof q.description === "string"
              ? q.description.slice(0, 150)
              : "",
          category: "ควิซของฉัน",
          theme: "digital",
          emoji: "✨",
          questions: validateQuestions(q.questions),
        };
        await ref.set({ quiz, updatedAt: Date.now(), updatedBy: user.uid });
      }
      return response({ ok: true });
    }
    if (data.action === "create") {
      requireAdmin(user);
      const quiz = quizzes.find((q) => q.id === data.quizId);
      const questions = validateQuestions(data.questions || quiz?.questions);
      const title =
        typeof data.title === "string" ? data.title.trim() : quiz?.title;
      if (!title || title.length > 100)
        throw new GameError("ตั้งชื่อควิซ 1–100 ตัวอักษร");
      await rateLimit("create_" + hash(user.uid), 12, 3600000);
      for (let n = 0; n < 6; n++) {
        const now = Date.now(),
          pin = String(randomInt(100000, 1000000));
        const room: Room = {
          pin,
          title,
          hostHash: "",
          hostUid: user.uid,
          questions,
          phase: "lobby",
          index: 0,
          startedAt: 0,
          createdAt: now,
          expiresAt: now + 21600000,
          players: {},
          answers: {},
        };
        if (await createRoom(room)) return response({ pin, role: "host" });
      }
      throw new GameError("สร้างห้องไม่ได้ กรุณาลองใหม่", 503);
    }
    pinCheck(data.pin);
    const pin = data.pin;
    if (data.action === "join") {
      await rateLimit("join_" + hash(user.uid), 30, 60000);
      await mutateRoom(pin, (room) => {
        const now = Date.now();
        assertActive(room, now);
        if (room.players[user.uid]) return;
        addPlayer(
          room,
          user.uid,
          "",
          data.name || user.name || user.email?.split("@")[0],
          avatars.includes(data.avatar) ? data.avatar : avatars[0],
          now,
        );
      });
      return response({ pin, role: "player", playerId: user.uid });
    }
    await mutateRoom(pin, (room) => {
      const now = Date.now();
      assertActive(room, now);
      const who = identity(room, user, data.role);
      if (data.action === "advance" && who.host) {
        settle(room, now);
        if (data.index !== room.index || data.phase !== room.phase)
          throw new GameError("สถานะเกมเปลี่ยนแล้ว กรุณาลองอีกครั้ง", 409);
        advance(room, now);
      } else if (data.action === "end" && who.host) room.phase = "finished";
      else if (data.action === "answer" && who.playerId)
        submitAnswer(room, who.playerId, data.choice, data.index, now);
      else throw new GameError("ไม่สามารถทำรายการนี้ได้", 403);
    });
    return response({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
