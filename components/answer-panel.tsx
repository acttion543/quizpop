"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import type { PublicRoom } from "../lib/types";
const shapes = ["▲", "◆", "●", "■"];
type Attempt = {
  choice: number;
  status: "sending" | "confirmed" | "failed";
  error?: string;
};
type Props = {
  room: PublicRoom;
  remaining: number;
  disabled?: boolean;
  onSubmit: (choice: number, signal: AbortSignal) => Promise<void>;
  onRefresh: () => Promise<void>;
};
export function AnswerPanel({
  room,
  remaining,
  disabled = false,
  onSubmit,
  onRefresh,
}: Props) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controllerRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (room.hasAnswered && attemptRef.current?.status !== "confirmed") {
      const next = attemptRef.current
        ? {
            ...attemptRef.current,
            choice: room.myChoice ?? attemptRef.current.choice,
            status: "confirmed" as const,
          }
        : null;
      attemptRef.current = next;
      setAttempt(next);
    }
  }, [room.hasAnswered, room.myChoice]);
  async function send(choice: number, retry = false) {
    const previous = attemptRef.current;
    if (
      room.phase !== "question" ||
      room.isHost ||
      room.hasAnswered ||
      disabled ||
      remaining <= 0
    )
      return;
    if (
      previous &&
      (!retry || previous.status !== "failed" || previous.choice !== choice)
    )
      return;
    const pending: Attempt = { choice, status: "sending" };
    attemptRef.current = pending;
    setAttempt(pending);
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      await onSubmit(choice, controller.signal);
      if (mounted.current) {
        const next: Attempt = { choice, status: "confirmed" };
        attemptRef.current = next;
        setAttempt(next);
      }
    } catch (e) {
      if (mounted.current && attemptRef.current?.status !== "confirmed") {
        const next: Attempt = {
          choice,
          status: "failed",
          error: controller.signal.aborted
            ? "การเชื่อมต่อใช้เวลานานกว่าปกติ"
            : (e as Error).message,
        };
        attemptRef.current = next;
        setAttempt(next);
        // A lost response may still have committed; reconcile before offering another attempt.
        void onRefresh();
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  const revealed = room.phase === "reveal" || room.phase === "finished";
  const confirmed = room.hasAnswered || attempt?.status === "confirmed";
  const status = confirmed ? "confirmed" : attempt?.status;
  if (
    room.phase === "question" &&
    !room.isHost &&
    (attempt || room.hasAnswered)
  ) {
    const choice = room.myChoice ?? attempt?.choice;
    return (
      <section
        className={"answer-receipt " + (status || "confirmed")}
        data-testid="answer-receipt"
      >
        <div className="receipt-main">
          <div
            className={
              "receipt-symbol " +
              (choice !== undefined ? "choice-" + choice : "")
            }
          >
            {status === "failed" ? (
              <WifiOff size={29} />
            ) : confirmed ? (
              <Check size={36} />
            ) : choice !== undefined ? (
              shapes[choice]
            ) : (
              <Check size={36} />
            )}
          </div>
          <div className="receipt-copy">
            <span className="receipt-kicker">
              {choice !== undefined
                ? "เลือกข้อ " + String.fromCharCode(65 + choice) + " แล้ว"
                : "คำตอบของคุณ"}
            </span>
            <h2 role="status" aria-live="polite">
              {confirmed
                ? "บันทึกคำตอบแล้ว!"
                : status === "failed"
                  ? "ยังยืนยันคำตอบไม่ได้"
                  : "รับการเลือกแล้ว กำลังส่ง…"}
            </h2>
            <p>
              {confirmed
                ? "เตรียมลุ้นเฉลยพร้อมเพื่อน ๆ ได้เลย"
                : status === "failed"
                  ? attempt?.error
                  : "กดได้ครั้งเดียว ไม่ต้องกดซ้ำ เดี๋ยวระบบจัดการให้"}
            </p>
          </div>
          <span className="receipt-corner" aria-hidden="true">
            {confirmed ? "✦" : "✧"}
          </span>
        </div>
        {choice !== undefined && (
          <div className="receipt-choice">
            <span>{String.fromCharCode(65 + choice)}</span>
            <strong>{room.question?.options[choice]}</strong>
          </div>
        )}
        <div className="receipt-footer">
          {confirmed ? (
            <>
              <ShieldCheck size={18} />
              <span>คำตอบถูกล็อกแล้ว · รอประกาศคะแนน</span>
              <span className="receipt-check">
                <CheckCircle2 size={17} />
                พร้อมลุ้น
              </span>
            </>
          ) : status === "failed" ? (
            <>
              <span>ส่งซ้ำได้เฉพาะคำตอบเดิม คะแนนจะนับครั้งเดียว</span>
              {remaining > 0 && (
                <button
                  className="button white"
                  disabled={disabled}
                  onClick={() => send(choice!, true)}
                >
                  <RotateCcw size={16} />
                  ลองส่งอีกครั้ง
                </button>
              )}
            </>
          ) : (
            <>
              <LoaderCircle className="spin" size={18} />
              <span>กำลังยืนยันกับห้องเกม</span>
              <i className="sending-dots">
                <i />
                <i />
                <i />
              </i>
            </>
          )}
        </div>
      </section>
    );
  }
  return (
    <div
      className={"answer-grid " + (revealed ? "revealed" : "")}
      data-testid="answer-options"
    >
      {room.question?.options.map((option, i) => (
        <button
          key={i}
          disabled={
            revealed ||
            room.isHost ||
            disabled ||
            room.hasAnswered ||
            !!attempt ||
            remaining === 0
          }
          className={
            "answer-tile choice-" +
            i +
            (revealed && room.question?.correct === i ? " correct" : "") +
            (revealed && room.question?.correct !== i ? " incorrect" : "")
          }
          onClick={() => send(i)}
          aria-label={String.fromCharCode(65 + i) + ". " + option}
        >
          <span className="answer-shape" aria-hidden="true">
            {shapes[i]}
          </span>
          <strong>
            <span className="option-letter">
              {String.fromCharCode(65 + i)}.
            </span>
            {option}
          </strong>
          {revealed && (
            <span className="answer-count">
              {room.distribution[i]} คน{" "}
              {room.question?.correct === i && <CheckCircle2 size={25} />}
            </span>
          )}
          {revealed && room.myAnswer?.choice === i && (
            <small className="your-answer-tag">คำตอบของคุณ</small>
          )}
        </button>
      ))}
    </div>
  );
}
