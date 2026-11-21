import type { PublicRoom, Question, Room } from "./types";
export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function validateQuestions(input: unknown): Question[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30)
    throw new GameError("ต้องมีคำถาม 1–30 ข้อ");
  return input.map((q) => {
    if (
      !q ||
      typeof q.text !== "string" ||
      !q.text.trim() ||
      q.text.length > 240 ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some(
        (o: unknown) => typeof o !== "string" || !o.trim() || o.length > 100,
      ) ||
      !Number.isInteger(q.correct) ||
      q.correct < 0 ||
      q.correct > 3 ||
      ![10, 15, 20, 30, 45, 60].includes(q.seconds)
    )
      throw new GameError("คำถามไม่สมบูรณ์ กรุณาตรวจโจทย์ ตัวเลือก และเฉลย");
    return {
      text: q.text.trim(),
      options: q.options.map((o: string) => o.trim()),
      correct: q.correct,
      seconds: q.seconds,
    };
  });
}
export function scoreAnswer(
  correct: boolean,
  elapsed: number,
  duration: number,
) {
  return correct
    ? Math.round(500 + 500 * (1 - Math.min(1, Math.max(0, elapsed / duration))))
    : 0;
}
export function settle(room: Room, now: number) {
  if (
    room.phase === "question" &&
    now >= room.startedAt + room.questions[room.index].seconds * 1000
  )
    room.phase = "reveal";
  return room;
}
export function assertActive(
  room: Room | null,
  now: number,
): asserts room is Room {
  if (!room || room.expiresAt <= now)
    throw new GameError("ไม่พบห้องนี้หรือห้องหมดอายุแล้ว", 404);
}
function validatePlayerName(room: Room, name: unknown, exceptId?: string) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 20)
    throw new GameError("ตั้งชื่อเล่น 1–20 ตัวอักษร");
  const trimmed = name.trim();
  if (
    Object.values(room.players).some(
      (p) =>
        p.id !== exceptId &&
        p.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  )
    throw new GameError("ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ");
  return trimmed;
}
export function renamePlayer(room: Room, playerId: string, name: unknown) {
  const player = room.players[playerId];
  if (!player) throw new GameError("กรุณาเข้าร่วมห้องก่อน", 403);
  if (room.phase === "finished")
    throw new GameError("เกมจบแล้ว ไม่สามารถเปลี่ยนชื่อได้", 409);
  player.name = validatePlayerName(room, name, playerId);
}
export function leaveLobby(room: Room, playerId: string) {
  if (!room.players[playerId]) return;
  if (room.phase !== "lobby")
    throw new GameError("เกมเริ่มแล้ว ไม่สามารถออกจากรายชื่อผู้สอบได้", 409);
  delete room.players[playerId];
}
export function addPlayer(
  room: Room,
  id: string,
  keyHash: string,
  name: unknown,
  avatar: string,
  now: number,
) {
  if (room.phase !== "lobby") throw new GameError("เกมเริ่มแล้ว รอเข้าห้องรอบถัดไป");
  if (Object.keys(room.players).length >= 50)
    throw new GameError("ห้องเต็มแล้ว (สูงสุด 50 คน)");
  const validName = validatePlayerName(room, name);
  room.players[id] = {
    id,
    keyHash,
    name: validName,
    avatar,
    score: 0,
    joinedAt: now,
  };
}
export function submitAnswer(
  room: Room,
  playerId: string,
  choice: unknown,
  index: unknown,
  now: number,
) {
  settle(room, now);
  if (room.phase !== "question") throw new GameError("หมดเวลาตอบแล้ว");
  if (index !== room.index)
    throw new GameError("คำถามเปลี่ยนแล้ว กรุณาลองอีกครั้ง", 409);
  if (
    !Number.isInteger(choice) ||
    (choice as number) < 0 ||
    (choice as number) > 3
  )
    throw new GameError("กรุณาเลือกคำตอบ");
  const p = room.players[playerId];
  if (!p) throw new GameError("กรุณาเข้าร่วมห้องก่อน", 403);
  const answers = (room.answers[String(room.index)] ||= {});
  if (answers[playerId]) throw new GameError("คุณตอบข้อนี้แล้ว", 409);
  const q = room.questions[room.index];
  const correct = choice === q.correct;
  const points = scoreAnswer(correct, now - room.startedAt, q.seconds * 1000);
  answers[playerId] = { choice: choice as number, points, correct, at: now };
  p.score += points;
  if (Object.keys(answers).length === Object.keys(room.players).length)
    room.phase = "reveal";
}
export function advance(room: Room, now: number) {
  settle(room, now);
  if (room.phase === "finished") throw new GameError("เกมจบแล้ว");
  if (room.phase === "lobby") {
    if (!Object.keys(room.players).length)
      throw new GameError("รอผู้เล่นอย่างน้อย 1 คนก่อนเริ่มเกม");
    room.index = 0;
    room.phase = "question";
    room.startedAt = now;
  } else if (room.phase === "question") room.phase = "reveal";
  else if (room.index + 1 >= room.questions.length) room.phase = "finished";
  else {
    room.index++;
    room.phase = "question";
    room.startedAt = now;
  }
}
export function publicRoom(
  room: Room,
  isHost: boolean,
  playerId: string | null,
  now: number,
): PublicRoom {
  settle(room, now);
  const q = room.questions[room.index];
  const visible = room.phase === "reveal" || room.phase === "finished";
  const answers = room.answers[String(room.index)] || {};
  const own = playerId ? answers[playerId] : undefined;
  const distribution = [0, 0, 0, 0];
  if (visible) Object.values(answers).forEach((a) => distribution[a.choice]++);
  return {
    pin: room.pin,
    title: room.title,
    phase: room.phase,
    index: room.index,
    total: room.questions.length,
    startedAt: room.startedAt,
    deadline: room.startedAt + q.seconds * 1000,
    serverNow: now,
    question:
      room.phase === "lobby"
        ? null
        : {
            text: q.text,
            options: q.options,
            seconds: q.seconds,
            ...(visible ? { correct: q.correct } : {}),
          },
    players: Object.values(room.players)
      .map(({ id, name, avatar, score }) => ({
        id,
        name,
        avatar,
        score: visible ? score : score - (answers[id]?.points || 0),
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    answered: Object.keys(answers).length,
    distribution,
    isHost,
    playerId,
    myAnswer: visible && own ? own : null,
    hasAnswered: !!own,
  };
}
