import test from "node:test";
import assert from "node:assert/strict";
import {
  addPlayer,
  advance,
  assertActive,
  publicRoom,
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
