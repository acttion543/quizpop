"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  Check,
  Crown,
  Download,
  Home,
  Medal,
  PartyPopper,
  SkipForward,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { PublicRoom } from "../lib/types";
import { competitionRank } from "../lib/results-rank";
type Player = PublicRoom["players"][number];
function Score({
  value,
  active,
  motion,
}: {
  value: number;
  active: boolean;
  motion: boolean;
}) {
  const [display, setDisplay] = useState(motion ? 0 : value);
  useEffect(() => {
    if (!active) {
      setDisplay(0);
      return;
    }
    if (!motion) {
      setDisplay(value);
      return;
    }
    let frame = 0,
      start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / 1100);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, active, motion]);
  return (
    <span aria-label={value.toLocaleString() + " คะแนน"}>
      <span aria-hidden="true">{display.toLocaleString()}</span>
    </span>
  );
}
function Confetti() {
  return (
    <div className="celebration-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--x": ((i * 47) % 100) + "%",
              "--drift": (i % 2 ? 1 : -1) * (25 + (i % 7) * 12) + "px",
              "--delay": (i % 9) * 0.07 + "s",
              "--duration": 2.3 + (i % 6) * 0.17 + "s",
              "--turn": (i % 2 ? 1 : -1) * (260 + i * 15) + "deg",
              "--tone": ["#dcff93", "#f6ce65", "#b99afb", "#7bdde0", "#fff1c6"][
                i % 5
              ],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
function PodiumPlayer({
  player,
  index,
  rank,
  visible,
  motion,
  own,
}: {
  player: Player;
  index: number;
  rank: number;
  visible: boolean;
  motion: boolean;
  own: boolean;
}) {
  return (
    <div
      className={
        "winner-place place-" +
        index +
        (visible ? " is-revealed" : "") +
        (own ? " own-place" : "")
      }
      aria-hidden={!visible}
    >
      <div className="winner-person">
        {rank === 1 && (
          <Crown className="winner-crown" size={33} fill="currentColor" />
        )}
        <span className="winner-avatar">{player.avatar}</span>
        <strong>{visible ? player.name : "…"}</strong>
        {own && visible && <small className="podium-you">คุณ</small>}
        <span className="winner-points">
          {visible ? (
            <Score value={player.score} active={visible} motion={motion} />
          ) : (
            <span>••••</span>
          )}
          <small>คะแนน</small>
        </span>
      </div>
      <div className="winner-step">
        <span>{["🥇", "🥈", "🥉"][rank - 1]}</span>
        <b>{rank}</b>
        <i />
      </div>
      {!visible && <span className="podium-mystery">?</span>}
    </div>
  );
}
export function GameResults({
  room,
  solo,
  canExport,
  onHome,
  onExport,
}: {
  room: PublicRoom;
  solo: boolean;
  canExport: boolean;
  onHome: () => void;
  onExport: () => void;
}) {
  const [revealed, setRevealed] = useState<number[]>([]);
  const [motion, setMotion] = useState(true);
  const boardRef = useRef<HTMLElement>(null);
  const top = room.players.slice(0, 3);
  const winnerReady = revealed.includes(0) || !top.length;
  const me = room.players.find((p) => p.id === room.playerId);
  const rank = me ? competitionRank(room.players, me.score) : 0;
  const topScore = top[0]?.score || 0;
  const tiedWinners = room.players.filter((p) => p.score === topScore);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotion(!reduced);
    if (reduced || !room.players.length) {
      setRevealed([0, 1, 2]);
      return;
    }
    const delays =
      room.players.length === 1
        ? [[0, 550]]
        : room.players.length === 2
          ? [
              [1, 400],
              [0, 1100],
            ]
          : [
              [2, 250],
              [1, 800],
              [0, 1450],
            ];
    const timers = delays.map(([place, delay]) =>
      setTimeout(
        () => setRevealed((v) => (v.includes(place) ? v : [...v, place])),
        delay,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // Final results are fixed; polling must not replay the reveal.
  }, [room.pin]);
  function skip() {
    setMotion(false);
    setRevealed([0, 1, 2]);
  }
  function showBoard() {
    skip();
    requestAnimationFrame(() =>
      boardRef.current?.scrollIntoView({
        behavior: motion ? "smooth" : "auto",
        block: "start",
      }),
    );
  }
  const title = !top.length
    ? "เกมนี้ยังไม่มีผู้เล่น"
    : !winnerReady
      ? "เตรียมเสียงปรบมือให้…"
      : solo
        ? "เก่งมาก เล่นจบแล้ว!"
        : tiedWinners.length > 1
          ? "แชมป์ร่วมของเกมนี้!"
          : "เราได้แชมป์แล้ว!";
  return (
    <main className="results-experience">
      <section
        className={"celebration-stage " + (winnerReady ? "winner-ready" : "")}
        aria-label="ประกาศผลผู้ชนะ"
      >
        {winnerReady && motion && top.length > 0 && <Confetti />}
        <div className="stage-spark star-one" aria-hidden="true">
          ✦
        </div>
        <div className="stage-spark star-two" aria-hidden="true">
          ✧
        </div>
        <div className="stage-spark star-three" aria-hidden="true">
          ✦
        </div>
        <div className="stage-topline">
          <span className="quiz-complete">
            <Check size={14} />
            QUIZ COMPLETE
          </span>
          {!winnerReady && (
            <button onClick={skip}>
              <SkipForward size={15} />
              แสดงผลทันที
            </button>
          )}
          {winnerReady && (
            <span className="stage-room">
              <Users size={14} />
              {room.players.length} ผู้เล่น
            </span>
          )}
        </div>
        <header className="celebration-heading">
          <span className="finale-kicker">
            <Sparkles size={15} />
            THE GRAND FINALE
          </span>
          <h1 aria-live="polite">{title}</h1>
          <p>
            {room.title}
            <span>·</span>
            {room.total} คำถาม
          </p>
        </header>
        {top.length > 0 ? (
          <div className="winner-podium">
            {[1, 0, 2]
              .filter((i) => top[i])
              .map((i) => (
                <PodiumPlayer
                  key={top[i].id}
                  player={top[i]}
                  index={i}
                  rank={competitionRank(room.players, top[i].score)}
                  visible={revealed.includes(i)}
                  motion={motion}
                  own={top[i].id === room.playerId}
                />
              ))}
          </div>
        ) : (
          <div className="no-winner">
            <Trophy size={65} />
            <p>เปิดห้องใหม่ แล้วชวนเพื่อนมาสนุกด้วยกัน</p>
          </div>
        )}
        <div className="champion-announcement" role="status">
          {winnerReady && top.length > 0 ? (
            <>
              <Crown size={19} />
              <span>
                {tiedWinners.length > 1
                  ? tiedWinners
                      .slice(0, 3)
                      .map((p) => p.name)
                      .join(" · ") +
                    (tiedWinners.length > 3
                      ? " และอีก " + (tiedWinners.length - 3) + " คน"
                      : "")
                  : top[0].name}
              </span>
              <span className="champion-caption">
                {tiedWinners.length > 1 ? "คะแนนสูงสุดร่วมกัน" : "สุดยอดผู้ท้าชิง"}
              </span>
              <span aria-hidden="true">✦</span>
            </>
          ) : (
            <span className="reveal-teaser">
              {top.length ? "อีกนิดเดียว… ใครจะคว้าอันดับหนึ่ง?" : "พบกันในเกมถัดไป"}
            </span>
          )}
        </div>
      </section>
      <section className="finale-summary">
        {me && winnerReady ? (
          <div className="personal-result">
            <span className="personal-avatar">{me.avatar}</span>
            <div className="personal-result-copy">
              <span>นี่คือผลงานของคุณ</span>
              <h2>
                {me.name}
                <span className="personal-rank">
                  อันดับ {rank}
                  <small> / {room.players.length}</small>
                </span>
              </h2>
              <p>
                {rank === 1
                  ? "เก่งมาก! คุณขึ้นแท่นอันดับหนึ่งในเกมนี้"
                  : rank <= 3
                    ? "ขึ้นโพเดียมแล้ว! รอบหน้าลองคว้าแชมป์กัน"
                    : "ทุกคำถามทำให้เก่งขึ้น รอบหน้าเอาใหม่ได้เสมอ"}
              </p>
            </div>
            <div className="personal-total">
              <small>คะแนนรวม</small>
              <strong>
                <Score value={me.score} active={winnerReady} motion={motion} />
              </strong>
              <span>POINTS</span>
            </div>
          </div>
        ) : (
          <div className="host-result-note">
            <PartyPopper size={25} />
            <div>
              <strong>{winnerReady ? "ทุกคนเก่งมาก!" : "กำลังเปิดโพเดียม…"}</strong>
              <p>
                {winnerReady
                  ? "ขอบคุณที่เปลี่ยนคำถามให้เป็นความสนุกไปด้วยกัน"
                  : "อีกนิดเดียว แล้วมาดูผลงานของคุณกัน"}
              </p>
            </div>
            <span>
              <Users size={17} />
              {room.players.length} ผู้ท้าชิง
            </span>
          </div>
        )}
        <div className="finale-actions">
          <button className="button primary" onClick={onHome}>
            <Home size={18} />
            {solo ? "เลือกควิซใหม่" : room.isHost ? "จัดเกมรอบใหม่" : "กลับหน้าหลัก"}
          </button>
          <button className="button white" onClick={showBoard}>
            <ArrowDown size={18} />
            ดูคะแนนทั้งหมด
          </button>
          {canExport && (
            <button className="button score-export" onClick={onExport}>
              <Download size={17} />
              ดาวน์โหลดคะแนน
            </button>
          )}
        </div>
        <section
          className="finale-board"
          ref={boardRef}
          hidden={!winnerReady}
          aria-label="กระดานคะแนนทั้งหมด"
        >
          <div className="finale-board-heading">
            <div>
              <Medal size={23} />
              <h2>ทุกอันดับมีเรื่องให้ภูมิใจ</h2>
            </div>
            <span>{room.players.length} ผู้เล่น</span>
          </div>
          <div className="board-column-labels">
            <span>อันดับ / ผู้ท้าชิง</span>
            <span>คะแนนรวม</span>
          </div>
          {room.players.map((p, i) => (
            <div
              className={
                "finale-score-row " +
                (p.id === room.playerId ? "your-score-row" : "") +
                (competitionRank(room.players, p.score) <= 3
                  ? " top-score"
                  : "")
              }
              key={p.id}
              style={
                { "--row-delay": Math.min(i, 7) * 0.04 + "s" } as CSSProperties
              }
            >
              <span className="finale-rank">
                {competitionRank(room.players, p.score) <= 3
                  ? ["🥇", "🥈", "🥉"][
                      competitionRank(room.players, p.score) - 1
                    ]
                  : String(competitionRank(room.players, p.score)).padStart(
                      2,
                      "0",
                    )}
              </span>
              <span className="finale-row-avatar">{p.avatar}</span>
              <strong>
                {p.name}
                {p.id === room.playerId && <small>คุณ</small>}
              </strong>
              <b>
                {p.score.toLocaleString()}
                <small>คะแนน</small>
              </b>
            </div>
          ))}
          {!room.players.length && (
            <p className="board-empty">ยังไม่มีคะแนนในเกมนี้</p>
          )}
        </section>
        <footer className="finale-footnote">
          <Zap size={14} fill="currentColor" />
          จบเกมนี้ แต่อย่าหยุดสงสัย <span>✦</span> แล้วเจอกันรอบหน้า!
        </footer>
      </section>
    </main>
  );
}
