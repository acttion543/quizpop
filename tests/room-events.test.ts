import test from "node:test";
import assert from "node:assert/strict";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Room, PublicRoom } from "../lib/types";
import { createRoomEventStream } from "../lib/room-events";
import { readRoomEvents } from "../lib/read-room-events";
import { roomIdentity } from "../lib/room-access";
import { addPlayer, advance, submitAnswer } from "../lib/engine";
import dearBoss from "../data/dear-boss.json";

function fixture() {
  const room: Room = {
    pin: "123456", hostHash: "private-host", hostUid: "host", revision: 1,
    title: "Live test", questions: [{ text: "Question", options: ["A","B","C","D"], correct: 1, seconds: 20 }],
    phase: "lobby", index: 0, startedAt: 0, createdAt: Date.now(), expiresAt: Date.now() + 3600000,
    players: {}, answers: {},
  };
  addPlayer(room, "a", "secret-a", "Alice", "😎", Date.now());
  addPlayer(room, "b", "secret-b", "Bob", "🦊", Date.now());
  advance(room, Date.now());
  return room;
}
function harness(room: Room, signal = new AbortController().signal) {
  let next: (r: Room | null) => void = () => {};
  let detached = 0;
  const stream = createRoomEventStream({
    initial: room,
    identify: (r) => {
      if (!r.players.a) throw new Error("Access removed");
      return { host: false, playerId: "a" };
    },
    subscribe: (fn) => { next = fn; return () => { detached++; }; },
    signal,
  });
  return { stream, next: (r: Room | null) => next(r), detached: () => detached };
}
async function roomFrame(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  while (true) {
    const result = await reader.read();
    assert.equal(result.done, false);
    const text = decoder.decode(result.value);
    if (text.startsWith("data: ")) return JSON.parse(text.slice(6));
  }
}

test("live snapshots hide correctness and immediately reveal after the last answer", async () => {
  const room = fixture(), live = harness(room), reader = live.stream.getReader();
  const first = await roomFrame(reader);
  assert.equal(first.room.question.correct, undefined);
  assert.equal(JSON.stringify(first).includes("secret-a"), false);
  submitAnswer(room, "a", 1, 0, Date.now());
  room.revision = 2;
  live.next(room);
  assert.equal((await roomFrame(reader)).room.phase, "question");
  submitAnswer(room, "b", 0, 0, Date.now());
  room.revision = 3;
  live.next(room);
  const revealed = await roomFrame(reader);
  assert.equal(revealed.room.phase, "reveal");
  assert.equal(revealed.room.question.correct, 1);
  assert.equal(revealed.room.answered, 2);
  await reader.cancel();
  assert.equal(live.detached(), 1);
});

test("the server pushes a reveal at 20 seconds without another write or GET", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout", "setInterval"], now: 100000 });
  const live = harness(fixture()), reader = live.stream.getReader();
  assert.equal((await roomFrame(reader)).room.phase, "question");
  t.mock.timers.tick(20005);
  const reveal = await roomFrame(reader);
  assert.equal(reveal.room.phase, "reveal");
  assert.equal(reveal.room.question.correct, 1);
  await reader.cancel();
  assert.equal(live.detached(), 1);
});

test("closing or aborting a live connection detaches the Firestore listener", async () => {
  const controller = new AbortController(), live = harness(fixture(), controller.signal);
  const reader = live.stream.getReader();
  await roomFrame(reader);
  controller.abort();
  assert.equal(live.detached(), 1);
  assert.equal((await reader.read()).done, true);
  live.next(fixture());
  assert.equal(live.detached(), 1);
});

test("losing membership or deleting the room ends a stream without more room data", async () => {
  for (const remove of [false, true]) {
    const room = fixture(), live = harness(room), reader = live.stream.getReader();
    await roomFrame(reader);
    if (remove) { delete room.players.a; live.next(room); }
    else live.next(null);
    assert.equal((await roomFrame(reader)).type, "error");
    assert.equal((await reader.read()).done, true);
    assert.equal(live.detached(), 1);
  }
});

test("only the owning admin or an actual participant can read live room data", () => {
  process.env.ADMIN_EMAILS = "host@example.com";
  const room = fixture();
  const host = { uid: "host", email: "host@example.com", email_verified: true } as DecodedIdToken;
  assert.deepEqual(roomIdentity(room, host, "host"), { host: true, playerId: null });
  assert.throws(() => roomIdentity(room, { ...host, uid: "other" }, "host"), { status: 403 });
  assert.throws(() => roomIdentity(room, { ...host, uid: "outsider" }, "player"), { status: 403 });
  assert.deepEqual(roomIdentity(room, { uid: "a" } as DecodedIdToken, "player"), { host: false, playerId: "a" });
});

test("the client decodes split UTF-8 frames, ignores heartbeats and closes on finished", async () => {
  const encoder = new TextEncoder();
  let cancelled = 0, activity = 0;
  const source = encoder.encode(': keepalive\n\ndata: ' + JSON.stringify({ type: "room", room: { title: "คำถาม", phase: "finished" } }) + '\n\n');
  const stream = new ReadableStream<Uint8Array>({
    start(c) { for (let i = 0; i < source.length; i += 3) c.enqueue(source.slice(i, i + 3)); },
    cancel() { cancelled++; },
  });
  const rooms: PublicRoom[] = [];
  await readRoomEvents(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }),
    (r) => { rooms.push(r); return false; }, () => activity++);
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].title, "คำถาม");
  assert.ok(activity > 1);
  assert.equal(cancelled, 1);
});

test("Dear Boss has ten unchanged answer choices and a 20-second deadline per question", () => {
  assert.equal(dearBoss.questions.length, 10);
  assert.ok(dearBoss.questions.every((q) => q.seconds === 20));
  assert.deepEqual(dearBoss.questions.map((q) => q.correct), [1,2,1,2,1,2,1,2,1,2]);
});
