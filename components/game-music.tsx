"use client";
import { useEffect, useRef } from "react";
import { Volume2, LoaderCircle, Music2 } from "lucide-react";
import { useGameAudio } from "@/components/game-audio-provider";
import type { Room } from "@/lib/types";

export function GameMusic({ phase, remaining }: { phase: Room["phase"]; remaining: number }) {
  const { playback, hasStarted, start, urgent } = useGameAudio();
  const gate = useRef<HTMLDivElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { void start(); }, [start]);
  useEffect(() => {
    urgent(phase === "question" && remaining > 0 && remaining <= 5);
  }, [phase, remaining, urgent]);
  useEffect(() => () => urgent(false), [urgent]);
  useEffect(() => {
    if (hasStarted) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startButton.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = gate.current?.querySelectorAll<HTMLElement>("button,a[href]");
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || !gate.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [hasStarted]);
  const playing = playback === "playing";
  return (
    <div className="game-music" data-music-control>
      <button type="button" className="music-toggle on" onClick={() => void start()}
        aria-label="ทดสอบเสียงอีกครั้ง" title="เพลงเล่นต่อเนื่อง ปรับหรือปิดเสียงจากเครื่องของคุณ">
        <Volume2 size={17} />
        <span>{playing ? "เสียงเปิด" : "แตะเริ่มเสียง"}</span>
        {playing && <i className="music-bars" aria-hidden="true"><b /><b /><b /></i>}
      </button>
      {!hasStarted && (
        <div className="audio-gate-backdrop">
          <div className="audio-gate" ref={gate} role="dialog" aria-modal="true" aria-labelledby="audio-gate-title">
            <span className="audio-gate-icon"><Music2 size={32} /></span>
            <span className="eyebrow">GET READY TO PLAY</span>
            <h2 id="audio-gate-title">เปิดเสียง แล้วมาลุ้นกัน!</h2>
            <p>แตะปุ่มด้านล่างเพื่อเริ่มเพลงและเข้าหน้าเกม</p>
            <button ref={startButton} type="button" className="button primary full" onClick={() => void start()}>
              {playback === "starting" ? <LoaderCircle size={19} className="spin" /> : <Volume2 size={19} />}
              เปิดเสียงและเข้าเกม
            </button>
            <p className="audio-gate-message" role="status">
              {playback === "error" ? "โหลดเพลงไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วแตะลองอีกครั้ง" :
                playback === "blocked" ? "Safari รอให้คุณแตะปุ่มเพื่อเริ่มเสียง" :
                playback === "playing" ? "กำลังตรวจว่าเพลงเริ่มเล่น..." : "เพลงจะเล่นต่อเนื่องตลอดการเล่น"}
            </p>
            <small>ลดหรือปิดความดังได้จากปุ่มเสียงของเครื่อง<br />หากไม่ดัง ให้ตรวจว่าเสียงออกลำโพงหรือหูฟัง Bluetooth</small>
            <a href="/" className="audio-gate-back">กลับหน้าหลัก</a>
          </div>
        </div>
      )}
    </div>
  );
}
