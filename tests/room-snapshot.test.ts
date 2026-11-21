import test from "node:test";
import assert from "node:assert/strict";
import { shouldAcceptSnapshot } from "../lib/room-snapshot";
import { competitionRank } from "../lib/results-rank";
import { publicRoom } from "../lib/engine";
import type { Room } from "../lib/types";
function snapshot() {
  const room: Room = {
    pin: "123456",
    hostHash: "private",
    questions: [
      {
        text: "Question",
        options: ["A", "B", "C", "D"],
        correct: 1,
        seconds: 30,
      },
    ],
    title: "Test",
    phase: "question",
    index: 0,
    startedAt: 1000,
    createdAt: 0,
    expiresAt: 100000,
    revision: 4,
    players: {},
    answers: {},
  };
  return publicRoom(room, false, "me", 2000);
}
test("older poll responses cannot erase a committed answer", () => {
  const confirmed = {
    ...snapshot(),
    revision: 5,
    hasAnswered: true,
    myChoice: 1,
  };
  assert.equal(
    shouldAcceptSnapshot({ ...snapshot(), serverNow: 3000 }, confirmed),
    false,
  );
});
test("a newer revision is accepted even if request clocks are out of order", () => {
  const previous = snapshot();
  assert.equal(
    shouldAcceptSnapshot(
      { ...previous, revision: 5, serverNow: 1900 },
      previous,
    ),
    true,
  );
});
test("deadline reveal cannot regress to the question at the same revision", () => {
  const revealed = { ...snapshot(), phase: "reveal" as const };
  assert.equal(
    shouldAcceptSnapshot({ ...snapshot(), serverNow: 4000 }, revealed),
    false,
  );
  assert.equal(shouldAcceptSnapshot(revealed, snapshot()), true);
});
test("newer snapshots cannot roll back the question index or a finished game", () => {
  const later = { ...snapshot(), index: 1, revision: 6 };
  assert.equal(
    shouldAcceptSnapshot({ ...snapshot(), revision: 7 }, later),
    false,
  );
  assert.equal(
    shouldAcceptSnapshot(
      { ...later, revision: 7 },
      { ...later, phase: "finished" },
    ),
    false,
  );
});
test("initial snapshots and another room can be accepted", () => {
  const current = snapshot();
  assert.equal(shouldAcceptSnapshot(current, null), true);
  assert.equal(
    shouldAcceptSnapshot({ ...current, pin: "654321", revision: 0 }, current),
    true,
  );
});
test("equal scores share the same competition rank", () => {
  const players = [
    { score: 1000 },
    { score: 1000 },
    { score: 900 },
    { score: 900 },
    { score: 400 },
  ];
  assert.deepEqual(
    players.map((p) => competitionRank(players, p.score)),
    [1, 1, 3, 3, 5],
  );
});
