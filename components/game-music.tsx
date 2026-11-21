"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, Volume2, VolumeX } from "lucide-react";
import { QuizMusic, type MusicPlayback } from "@/lib/quiz-music";
import { DEFAULT_MUSIC_VOLUME, MUSIC_PREFERENCE_KEY, readMusicPreferences } from "@/lib/music-preferences";
import type { Room } from "@/lib/types";

export function GameMusic({ phase, remaining }: { phase: Room["phase"]; remaining: number }) {
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<QuizMusic | null>(null);
  const desired = useRef(true);
  const hardwareVolume = useRef(false);
  const level = useRef(DEFAULT_MUSIC_VOLUME);
  const [enabled, setEnabled] = useState(true);
  const [playback, setPlayback] = useState<MusicPlayback>("starting");
  const [volume, setVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const [ios, setIos] = useState(false);

  function save(nextEnabled: boolean, nextVolume: number) {
    try { localStorage.setItem(MUSIC_PREFERENCE_KEY, JSON.stringify({ enabled: nextEnabled, volume: nextVolume })); } catch {}
  }
  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(MUSIC_PREFERENCE_KEY); } catch {}
    const saved = readMusicPreferences(raw);
    desired.current = saved.enabled;
    level.current = saved.volume;
    setEnabled(saved.enabled);
    setVolume(saved.volume);
    hardwareVolume.current = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    setIos(hardwareVolume.current);
    if (!audio.current) return;
    const music = new QuizMusic(audio.current, setPlayback);
    engine.current = music;
    music.setVolume(hardwareVolume.current ? 1 : saved.volume / 100);
    if (saved.enabled) void music.play();
    else music.pause();

    const activate = (event: Event) => {
      if ((event.target as Element | null)?.closest?.("[data-music-control]")) return;
      if (desired.current && !music.playing) void music.play();
    };
    const resume = () => {
      if (!document.hidden && desired.current && !music.playing) void music.play();
    };
    // iOS recognizes click/touchend for starting media. A pointerdown alone is insufficient.
    document.addEventListener("click", activate);
    document.addEventListener("touchend", activate, { passive: true });
    document.addEventListener("keydown", activate);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      document.removeEventListener("click", activate);
      document.removeEventListener("touchend", activate);
      document.removeEventListener("keydown", activate);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      music.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    // Keep the same audio element playing through lobby, questions, reveal and results.
    // Only the user or the browser/OS can pause it while this room is mounted.
    engine.current?.setUrgent(phase === "question" && remaining > 0 && remaining <= 5);
  }, [phase, remaining]);

  function start() {
    desired.current = true;
    setEnabled(true);
    const nextVolume = level.current === 0 ? DEFAULT_MUSIC_VOLUME : level.current;
    level.current = nextVolume;
    setVolume(nextVolume);
    save(true, nextVolume);
    engine.current?.setVolume(hardwareVolume.current ? 1 : nextVolume / 100);
    void engine.current?.play();
  }
  function toggle() {
    if (desired.current) {
      desired.current = false;
      setEnabled(false);
      save(false, level.current);
      engine.current?.pause();
    } else start();
  }
  function changeVolume(value: number) {
    level.current = value;
    setVolume(value);
    save(desired.current, value);
    engine.current?.setVolume(value / 100);
  }
  const playing = enabled && playback === "playing";
  return (
    <div className="game-music" data-music-control>
      <audio ref={audio} src="/audio/quizpop-suspense-v2.wav" loop preload="auto" aria-hidden="true" />
      <button type="button" className={"music-toggle " + (enabled ? "on" : "")} aria-pressed={enabled}
        aria-label={enabled ? "ปิดเพลงคลอ" : "เปิดเพลงคลอ"} onClick={toggle}
        title={enabled ? "เปิดเสียงต่อเนื่องจนกว่าคุณจะกดปิด" : "เปิดเพลงคลอ"}>
        {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        <span>{enabled ? (playing ? "เพลงเปิดอยู่" : "เสียงเปิด") : "เปิดเพลง"}</span>
        {playing && <i className="music-bars" aria-hidden="true"><b /><b /><b /></i>}
      </button>
      <details className="music-settings">
        <summary aria-label="ปรับระดับเสียงเพลง" title="ปรับระดับเสียงเพลง"><Music2 size={16} /></summary>
        <div className="music-volume">
          {ios ? <p>ปรับความดังด้วยปุ่มเพิ่ม–ลดเสียงของ iPhone / iPad</p> : (
            <label>ระดับเสียง <strong>{volume}%</strong>
              <input aria-label="ระดับเสียงเพลง" type="range" min="0" max="100" value={volume}
                onChange={(e) => changeVolume(Number(e.target.value))} />
            </label>
          )}
          <small>เพลงเล่นต่อเนื่อง · เร่งจังหวะช่วง 5 วินาทีสุดท้าย</small>
          <button className="music-retry" type="button" onClick={start}>เริ่มเพลงอีกครั้ง</button>
        </div>
      </details>
      {enabled && !playing && (
        <div className="music-notice" role="status">
          <span>{playback === "error" ? "โหลดเพลงไม่สำเร็จ ลองอีกครั้งได้เลย" :
            playback === "starting" ? "กำลังเตรียมเพลง หากยังไม่ดังให้แตะเริ่มเพลง" :
            "เบราว์เซอร์รอให้คุณแตะเพื่อเริ่มเสียง"}</span>
          <button type="button" onClick={start}>แตะเริ่มเพลง</button>
        </div>
      )}
    </div>
  );
}
