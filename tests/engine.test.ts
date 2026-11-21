import test from "node:test";
import assert from "node:assert/strict";
import {
  addPlayer,
  advance,
  assertActive,
  publicRoom,
  leaveLobby,
  renamePlayer,
  scoreAnswer,
  settle,
  submitAnswer,
  validateQuestions,
} from "../lib/engine";
import type { Room } from "../lib/types";
const q = {
  text: "2 + 2 เท่ากับเท่าไร?",
  options: ["1", "2", "3", "4"],
  correct: 3,
  seconds: 20,
};
function room(): Room {
  const r: Room = {
    pin: "123456",
    title: "Test",
    hostHash: "private-host",
    hostUid: "admin",
    questions: [q, { ...q, text: "Second" }],
    phase: "lobby",
    index: 0,
    startedAt: 0,
    createdAt: 100,
    expiresAt: 999999,
    players: {},
    answers: {},
  };
  addPlayer(r, "a", "secret-a", "Alice", "🦊", 100);
  addPlayer(r, "b", "secret-b", "Bob", "🐸", 100);
  return r;
}
test("score rewards speed, clamps time, wrong answer always scores zero", () => {
  assert.equal(scoreAnswer(true, 0, 20000), 1000);
  assert.equal(scoreAnswer(true, 10000, 20000), 750);
  assert.equal(scoreAnswer(true, 20000, 20000), 500);
  assert.equal(scoreAnswer(true, -500, 20000), 1000);
  assert.equal(scoreAnswer(false, 0, 20000), 0);
});
test("complete synchronized game starts, reveals, advances and finishes", () => {
  const r = room();
  advance(r, 1000);
  assert.equal(r.phase, "question");
  submitAnswer(r, "a", 3, 0, 3000);
  assert.equal(r.phase, "question");
  submitAnswer(r, "b", 1, 0, 4000);
  assert.equal(r.phase, "reveal");
  assert.equal(r.players.a.score, 950);
  advance(r, 5000);
  assert.equal(r.index, 1);
  assert.equal(r.startedAt, 5000);
  submitAnswer(r, "a", 3, 1, 6000);
  submitAnswer(r, "b", 3, 1, 7000);
  advance(r, 8000);
  assert.equal(r.phase, "finished");
  assert.equal(r.players.a.score, 1925);
  assert.equal(r.players.b.score, 950);
});
test("active question never exposes correct choice, points, secrets or others' answers", () => {
  const r = room();
  advance(r, 1000);
  submitAnswer(r, "a", 3, 0, 2000);
  const p = publicRoom(r, false, "a", 3000);
  assert.equal(p.question?.correct, undefined);
  assert.equal(p.myAnswer, null);
  assert.equal(p.hasAnswered, true);
  assert.equal(p.myChoice, 3);
  assert.equal(publicRoom(r, false, "b", 3000).myChoice, null);
  assert.equal(p.players.find((v) => v.id === "a")?.score, 0);
  assert.deepEqual(p.distribution, [0, 0, 0, 0]);
  const json = JSON.stringify(p);
  assert.ok(!json.includes("private-host"));
  assert.ok(!json.includes("secret-a"));
  assert.ok(!json.includes("hostUid"));
  assert.equal(publicRoom(r, true, null, 3000).question?.correct, undefined);
});
test("reveal exposes correct answer, own result and ranks only after round closes", () => {
  const r = room();
  advance(r, 1000);
  submitAnswer(r, "a", 3, 0, 2000);
  advance(r, 3000);
  const p = publicRoom(r, false, "a", 3000);
  assert.equal(p.question?.correct, 3);
  assert.equal(p.myAnswer?.points, 975);
  assert.equal(p.players[0].id, "a");
  assert.deepEqual(p.distribution, [0, 0, 0, 1]);
  assert.equal(publicRoom(r, false, "b", 3000).myAnswer, null);
});
test("duplicate and stale answers do not change score", () => {
  const r = room();
  advance(r, 1000);
  submitAnswer(r, "a", 3, 0, 2000);
  assert.throws(() => submitAnswer(r, "a", 3, 0, 3000), /ตอบข้อนี้แล้ว/);
  assert.equal(r.players.a.score, 975);
  assert.throws(() => submitAnswer(r, "b", 3, 1, 3000), /คำถามเปลี่ยนแล้ว/);
});
test("server rejects answers exactly at deadline and later", () => {
  const r = room();
  advance(r, 1000);
  assert.throws(() => submitAnswer(r, "a", 3, 0, 21000), /หมดเวลา/);
  assert.equal(r.players.a.score, 0);
  assert.equal(r.phase, "reveal");
});
test("clock expiry reveals without needing host action", () => {
  const r = room();
  advance(r, 1000);
  settle(r, 21001);
  assert.equal(r.phase, "reveal");
});
test("host cannot start empty game; late joins and duplicate names rejected", () => {
  const r = room();
  assert.throws(() => addPlayer(r, "c", "", "alice", "🐼", 100), /ชื่อนี้/);
  r.players = {};
  assert.throws(() => advance(r, 1000), /อย่างน้อย/);
  addPlayer(r, "a", "", "Alice", "🦊", 1000);
  advance(r, 2000);
  assert.throws(() => addPlayer(r, "b", "", "Bob", "🐸", 3000), /เกมเริ่ม/);
});
test("invalid questions and answer indexes rejected", () => {
  assert.equal(validateQuestions([q])[0].correct, 3);
  for (const input of [
    [],
    [null],
    [{ ...q, correct: 4 }],
    [{ ...q, seconds: 1 }],
    [{ ...q, options: ["a"] }],
    [{ ...q, text: " " }],
    [{ ...q, options: ["a", "b", "c", " "] }],
  ])
    assert.throws(() => validateQuestions(input));
  const r = room();
  advance(r, 1000);
  assert.throws(() => submitAnswer(r, "a", 99, 0, 2000));
  assert.throws(() => submitAnswer(r, "nobody", 3, 0, 2000));
});
test("expired rooms and missing rooms cannot be used", () => {
  assert.throws(() => assertActive(null, 1000));
  assert.throws(() => assertActive(room(), 1000000));
});
test("player capacity is bounded at 50", () => {
  const r = room();
  for (let i = 2; i < 50; i++)
    addPlayer(r, "p" + i, "", "Player" + i, "🦊", 100);
  assert.throws(
    () => addPlayer(r, "overflow", "", "Extra", "🦊", 100),
    /ห้องเต็ม/,
  );
});

test("leaving the lobby removes the participant from attendance and final results", () => {
  const r = room();
  leaveLobby(r, "a");
  const lobby = publicRoom(r, true, null, 500);
  assert.deepEqual(
    lobby.players.map((p) => p.id),
    ["b"],
  );
  assert.equal(
    lobby.players.some((p) => p.name === "Alice"),
    false,
  );
  assert.equal(Object.keys(r.players).length, 1);
  advance(r, 1000);
  submitAnswer(r, "b", 3, 0, 2000);
  assert.equal(r.phase, "reveal");
  advance(r, 3000);
  submitAnswer(r, "b", 3, 1, 4000);
  advance(r, 5000);
  assert.equal(r.phase, "finished");
  assert.deepEqual(
    publicRoom(r, true, null, 5000).players.map((p) => p.id),
    ["b"],
  );
});
test("leaving is idempotent and the player can rejoin before the start", () => {
  const r = room();
  const bob = structuredClone(r.players.b);
  leaveLobby(r, "a");
  leaveLobby(r, "a");
  assert.deepEqual(r.players.b, bob);
  addPlayer(r, "a", "", "Alice", "🦊", 300);
  assert.equal(r.players.a.name, "Alice");
  assert.equal(Object.keys(r.players).length, 2);
});
test("the last participant leaving does not leave a ghost eligible for starting", () => {
  const r = room();
  leaveLobby(r, "a");
  leaveLobby(r, "b");
  assert.throws(() => advance(r, 1000), /อย่างน้อย/);
  assert.equal(r.phase, "lobby");
});
test("a start racing with leaving preserves participants and exam records", () => {
  for (const phase of ["question", "reveal", "finished"] as const) {
    const r = room();
    advance(r, 1000);
    r.phase = phase;
    const before = structuredClone(r);
    assert.throws(() => leaveLobby(r, "a"), { status: 409 });
    assert.deepEqual(r, before);
  }
});
test("renaming the lobby player is visible to the host and other players", () => {
  const r = room();
  renamePlayer(r, "a", "  ชื่อใหม่  ");
  assert.equal(
    publicRoom(r, true, null, 500).players.find((p) => p.id === "a")?.name,
    "ชื่อใหม่",
  );
  assert.equal(
    publicRoom(r, false, "b", 500).players.find((p) => p.id === "a")?.name,
    "ชื่อใหม่",
  );
  assert.equal(r.players.b.name, "Bob");
});
test("renaming during a question preserves identity, submitted answers and points", () => {
  const r = room();
  advance(r, 1000);
  submitAnswer(r, "a", 3, 0, 2000);
  const playerBefore = structuredClone(r.players.a);
  const answersBefore = structuredClone(r.answers);
  renamePlayer(r, "a", "New Alice");
  assert.deepEqual(r.players.a, { ...playerBefore, name: "New Alice" });
  assert.deepEqual(r.answers, answersBefore);
  const active = publicRoom(r, false, "a", 3000);
  assert.equal(active.hasAnswered, true);
  assert.equal(active.myAnswer, null);
  assert.equal(active.players.find((p) => p.id === "a")?.score, 0);
  submitAnswer(r, "b", 1, 0, 4000);
  const revealed = publicRoom(r, true, null, 4000);
  assert.equal(revealed.players[0].name, "New Alice");
  assert.equal(revealed.players[0].score, 975);
});
test("renaming rejects duplicate and invalid names without changing the player", () => {
  const r = room();
  for (const name of [" bob ", "", "   ", "a".repeat(21), null, 123]) {
    const before = structuredClone(r.players);
    assert.throws(() => renamePlayer(r, "a", name));
    assert.deepEqual(r.players, before);
  }
  renamePlayer(r, "a", "ALICE");
  assert.equal(r.players.a.name, "ALICE");
  assert.throws(() => addPlayer(r, "c", "", "alice", "🐼", 300), /ชื่อนี้/);
});
test("missing participants and completed games cannot be renamed", () => {
  const r = room();
  assert.throws(() => renamePlayer(r, "stranger", "Name"), { status: 403 });
  r.phase = "finished";
  const before = structuredClone(r);
  assert.throws(() => renamePlayer(r, "a", "Changed"), { status: 409 });
  assert.deepEqual(r, before);
});
