import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { Room } from "./types";
import { GameError } from "./engine";
export function isConfigured() {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    ((process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}
export function database() {
  if (!isConfigured())
    throw new GameError(
      "ยังไม่ได้เชื่อม Firebase — ทดลองเล่นคนเดียวก่อนได้ หรือตั้งค่าตาม README",
      503,
    );
  if (!getApps().length)
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      ...(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
        ? {
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
                /\\n/g,
                "\n",
              ),
            }),
          }
        : {}),
    });
  return getFirestore();
}
export async function readRoom(pin: string): Promise<Room | null> {
  const d = await database().collection("quizpopRooms").doc(pin).get();
  return d.exists ? (d.data() as Room) : null;
}
export async function createRoom(room: Room) {
  try {
    await database()
      .collection("quizpopRooms")
      .doc(room.pin)
      .create({ ...room, deleteAfter: new Date(room.expiresAt) });
  } catch (e) {
    if ((e as { code?: number }).code === 6) return false;
    throw e;
  }
  return true;
}
export async function mutateRoom<T>(pin: string, fn: (room: Room | null) => T) {
  const db = database();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("quizpopRooms").doc(pin);
    const snap = await tx.get(ref);
    const room = snap.exists ? (snap.data() as Room) : null;
    const result = fn(room);
    if (room) tx.set(ref, { ...room, deleteAfter: new Date(room.expiresAt) });
    return result;
  });
}
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const db = database();
  await db.runTransaction(async (tx) => {
    const ref = db.collection("quizpopLimits").doc(key);
    const snap = await tx.get(ref);
    const old = snap.data();
    const now = Date.now();
    const current =
      old && old.resetAt > now ? old : { count: 0, resetAt: now + windowMs };
    if (current.count >= limit)
      throw new GameError("ทำรายการบ่อยเกินไป ลองใหม่ภายหลังนะ", 429);
    tx.set(ref, {
      count: current.count + 1,
      resetAt: current.resetAt,
      deleteAfter: new Date(current.resetAt),
    });
  });
}
