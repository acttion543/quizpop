import type { PublicRoom } from "./types";

export async function readRoomEvents(
  response: Response,
  onRoom: (room: PublicRoom) => boolean | void,
  onActivity: () => void,
) {
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream"))
    throw new Error("การเชื่อมต่อสดไม่พร้อม");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      onActivity();
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 262144) throw new Error("ข้อมูลห้องสดไม่ถูกต้อง");
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = frame.split("\n").find((line) => line.startsWith("data: "));
        if (!data) continue; // Heartbeat comment.
        const event = JSON.parse(data.slice(6));
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "room" && onRoom(event.room) === false) return;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
