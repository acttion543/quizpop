import type { PublicRoom } from "./types";
const phaseOrder = { lobby: 0, question: 1, reveal: 2, finished: 3 };
export function shouldAcceptSnapshot(
  next: PublicRoom,
  previous: PublicRoom | null,
) {
  if (!previous || next.pin !== previous.pin) return true;
  const nextRevision = next.revision || 0,
    previousRevision = previous.revision || 0;
  if (nextRevision < previousRevision) return false;
  if (previous.phase === "finished" && next.phase !== "finished") return false;
  if (next.index !== previous.index) return next.index > previous.index;
  if (phaseOrder[next.phase] !== phaseOrder[previous.phase])
    return phaseOrder[next.phase] > phaseOrder[previous.phase];
  if (nextRevision > previousRevision) return true;
  return next.serverNow >= previous.serverNow;
}
