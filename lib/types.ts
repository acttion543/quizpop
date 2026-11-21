export type Question = {
  text: string;
  options: string[];
  correct: number;
  seconds: number;
};
export type Quiz = {
  id: string;
  title: string;
  description: string;
  category: string;
  theme: string;
  emoji: string;
  questions: Question[];
};
export type Player = {
  id: string;
  name: string;
  avatar: string;
  keyHash: string;
  score: number;
  joinedAt: number;
};
export type Answer = {
  choice: number;
  points: number;
  correct: boolean;
  at: number;
};
export type Room = {
  pin: string;
  title: string;
  hostHash: string;
  hostUid?: string;
  questions: Question[];
  phase: "lobby" | "question" | "reveal" | "finished";
  index: number;
  startedAt: number;
  createdAt: number;
  expiresAt: number;
  players: Record<string, Player>;
  answers: Record<string, Record<string, Answer>>;
};
export type PublicRoom = {
  pin: string;
  title: string;
  phase: Room["phase"];
  index: number;
  total: number;
  startedAt: number;
  deadline: number;
  serverNow: number;
  question: (Omit<Question, "correct"> & { correct?: number }) | null;
  players: { id: string; name: string; avatar: string; score: number }[];
  answered: number;
  distribution: number[];
  isHost: boolean;
  playerId: string | null;
  myAnswer: Answer | null;
  hasAnswered: boolean;
};
