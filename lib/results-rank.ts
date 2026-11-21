export function competitionRank(
  players: readonly { score: number }[],
  score: number,
) {
  return 1 + players.filter((player) => player.score > score).length;
}
