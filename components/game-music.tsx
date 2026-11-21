"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, Volume2, VolumeX } from "lucide-react";
import { QuizMusic } from "@/lib/quiz-music";
import type { Room } from "@/lib/types";

export function GameMusic({ phase, remaining }: { phase: Room["phase"]; remaining: number }) {
  const engine = useRef<QuizMusic | null>(null);
  const desired = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [volume, setVolume] = useState(22);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("quizpop:music") || "null");
      if (saved) {
        desired.current = saved.enabled === true;
        setEnabled(desired.current);
        if (typeof saved.volume === "number") setVolume(Math.max(0, Math.min(100, saved.volume)));
      }
    } catch {}
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      if (engine.current) {
        engine.current.context.onstatechange = null;
        engine.current.dispose();
        engine.current = null;
      }
    };
  }, []);
  function save(nextEnabled: boolean, nextVolume: number) {
    try { localStorage.setItem("quizpop:music", JSON.stringify({ enabled: nextEnabled, volume: nextVolume })); } catch {}
  }
  async function unlock() {
    setError("");
    try {
      if (!engine.current) {
        const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) throw new Error("Audio unavailable");
        engine.current = new QuizMusic(new Audio());
        engine.current.context.onstatechange = () => setUnlocked(engine.current?.context.state === "running");
      }
      const ready = await engine.current.unlock();
      if (desired.current) setUnlocked(ready);
    } catch { setError("เปิดเพลงไม่ได้ ลองแตะปุ่มอีกครั้ง"); }
  }
  // A remembered preference can resume on the next real gesture (including host Start).
  useEffect(() => {
    if (!enabled || unlocked) return;
    const activate = () => { if (desired.current) void unlock(); };
    document.addEventListener("pointerdown", activate);
    document.addEventListener("keydown", activate);
    return () => {
      document.removeEventListener("pointerdown", activate);
      document.removeEventListener("keydown", activate);
    };
  }, [enabled, unlocked]);
  useEffect(() => {
    const music = engine.current;
    if (!music) return;
    music.setVolume(volume / 100);
    music.setUrgent(remaining <= 5);
    if (enabled && unlocked && visible && phase === "question" && remaining > 0) music.play();
    else music.pause();
  }, [phase, remaining, enabled, unlocked, visible, volume]);
  async function toggle() {
    if (enabled && unlocked) {
      desired.current = false;
      setEnabled(false);
      engine.current?.pause();
      save(false, volume);
    } else {
      desired.current = true;
      setEnabled(true);
      save(true, volume);
      await unlock();
    }
  }
  const on = enabled && unlocked;
  return (
    <div className="game-music">
      <button type="button" className={"music-toggle " + (on ? "on" : "")} aria-pressed={on}
        aria-label={on ? "ปิดเพลงคลอ" : "เปิดเพลงคลอ"} onClick={() => void toggle()}
        title={on ? "เพลงจะหยุดตอนเฉลยและจบเกม" : "แตะเพื่อเปิดเพลงคลอระหว่างตอบคำถาม"}>
        {on ? <Volume2 size={17} /> : <VolumeX size={17} />}
        <span>{on ? "เพลงเปิดอยู่" : "เปิดเพลง"}</span>
        {on && phase === "question" && remaining > 0 && visible && <i className="music-bars" aria-hidden="true"><b /><b /><b /></i>}
      </button>
      <details className="music-settings">
        <summary aria-label="ปรับระดับเสียงเพลง" title="ปรับระดับเสียงเพลง"><Music2 size={16} /></summary>
        <div className="music-volume">
          <label>ระดับเสียง <strong>{volume}%</strong>
            <input aria-label="ระดับเสียงเพลง" type="range" min="0" max="100" value={volume}
              onChange={(e) => { const v = Number(e.target.value); setVolume(v); save(enabled, v); }} />
          </label>
          <small>{error || "เพลงคลอลุ้น ๆ · เร่งจังหวะช่วง 5 วิ��าทีสุดท้าย"}</small>
        </div>
      </details>
      {error && <span className="sr-only" role="status">{error}</span>}
    </div>
  );
}
