"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { QuizMusic, type MusicPlayback } from "@/lib/quiz-music";

type AudioState = {
  playback: MusicPlayback;
  hasStarted: boolean;
  start: () => Promise<boolean>;
  urgent: (value: boolean) => void;
};
const AudioContext = createContext<AudioState | null>(null);
let startShared: (() => Promise<boolean>) | null = null;

// Call before awaiting a room API. Safari needs play() in the original tap handler.
export function requestGameAudio() {
  return startShared ? startShared() : Promise.resolve(false);
}
export function useGameAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("GameAudioProvider is required");
  return value;
}
export function GameAudioProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const engine = useRef<QuizMusic | null>(null);
  const [playback, setPlayback] = useState<MusicPlayback>("off");
  const [hasStarted, setHasStarted] = useState(false);
  const start = useCallback(() => {
    // Prefer the media playback session on Safari when the platform exposes it.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) { try { session.type = "playback"; } catch {} }
    return engine.current?.play() || Promise.resolve(false);
  }, []);
  const urgent = useCallback((value: boolean) => engine.current?.setUrgent(value), []);
  useEffect(() => {
    if (!audio.current) return;
    const music = new QuizMusic(audio.current, setPlayback);
    engine.current = music;
    startShared = start;
    const resume = () => {
      if (!document.hidden && music.requested && !music.playing) void start();
    };
    const activate = (event: Event) => {
      if ((event.target as Element | null)?.closest?.("[data-music-control]")) return;
      if (music.requested && !music.playing) void start();
    };
    document.addEventListener("click", activate);
    document.addEventListener("touchend", activate, { passive: true });
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      document.removeEventListener("click", activate);
      document.removeEventListener("touchend", activate);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      if (startShared === start) startShared = null;
      music.dispose();
      engine.current = null;
    };
  }, [start]);
  return (
    <AudioContext.Provider value={{ playback, hasStarted, start, urgent }}>
      <audio ref={audio} className="game-audio-element" preload="auto" loop aria-hidden="true"
        onTimeUpdate={() => {
          const media = audio.current;
          if (media && !media.paused && !media.muted && media.currentTime > .05) setHasStarted(true);
        }}>
        <source src="/audio/quizpop-suspense-v3.mp3" type="audio/mpeg" />
        <source src="/audio/quizpop-suspense-v2.wav" type="audio/wav" />
      </audio>
      {children}
    </AudioContext.Provider>
  );
}
