import type { Room } from "./types";
import { assertActive, GameError, publicRoom } from "./engine";

type Identity = { host: boolean; playerId: string | null };
type Options = {
  initial: Room;
  identify: (room: Room) => Identity;
  subscribe: (next: (room: Room | null) => void, error: () => void) => () => void;
  signal: AbortSignal;
};

// The browser only receives publicRoom; questions/answers stay private until reveal.
export function createRoomEventStream({ initial, identify, subscribe, signal }: Options) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let latest = initial;
      let unsubscribe = () => {};
      let deadline: ReturnType<typeof setTimeout> | undefined;
      let lifetime: ReturnType<typeof setTimeout> | undefined;
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      const finish = () => {
        if (closed) return;
        closed = true;
        clearTimeout(deadline);
        clearTimeout(lifetime);
        clearInterval(heartbeat);
        unsubscribe();
        signal.removeEventListener("abort", finish);
        try { controller.close(); } catch { /* Reader already cancelled. */ }
      };
      cleanup = finish;
      const sendError = (error: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode("data: " + JSON.stringify({
          type: "error",
          message: error instanceof GameError ? error.message : "การเชื่อมต่อสดขัดข้อง กำลังเชื่อมต่อใหม่",
        }) + "\n\n"));
        finish();
      };
      const emit = () => {
        if (closed) return;
        clearTimeout(deadline);
        try {
          const now = Date.now();
          assertActive(latest, now);
          const who = identify(latest);
          const room = publicRoom(structuredClone(latest), who.host, who.playerId, now);
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "room", room }) + "\n\n"));
          if (room.phase === "finished") return finish();
          if (room.phase === "question") {
            // No client write or polling is needed to expose a timed-out question.
            deadline = setTimeout(emit, Math.max(1, room.deadline - Date.now() + 5));
          }
        } catch (error) { sendError(error); }
      };
      signal.addEventListener("abort", finish, { once: true });
      if (signal.aborted) return finish();
      emit();
      if (closed) return;
      heartbeat = setInterval(() => {
        if (latest.expiresAt <= Date.now()) return sendError(new GameError("ห้องหมดอายุแล้ว", 404));
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 10000);
      // Reconnect with a fresh verified token before the Vercel execution limit.
      lifetime = setTimeout(finish, 240000);
      try {
        const stop = subscribe((room) => {
          if (!room) return sendError(new GameError("ไม่พบห้องนี้แล้ว", 404));
          latest = room;
          emit();
        }, () => sendError(new Error("Firestore listener failed")));
        if (closed) stop();
        else unsubscribe = stop;
      } catch (error) { sendError(error); }
    },
    cancel() { cleanup(); },
  });
}
