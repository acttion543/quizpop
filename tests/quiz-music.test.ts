import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QuizMusic, type MusicPlayback } from "../lib/quiz-music";
import config from "../next.config";

class FakeAudio extends EventTarget {
  loop = false; preload = ""; volume = 1; playbackRate = 1; muted = true;
  paused = true; ended = false; readyState = 4; error: unknown = null;
  playCalls = 0; pauseCalls = 0; loadCalls = 0;
  attributes = new Map<string, string>();
  start: () => Promise<void> = async () => {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
  };
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  play() { this.playCalls++; return this.start(); }
  pause() { this.paused = true; this.pauseCalls++; this.dispatchEvent(new Event("pause")); }
  load() { this.loadCalls++; this.error = null; }
}
function setup() {
  const audio = new FakeAudio(), states: MusicPlayback[] = [];
  const music = new QuizMusic(audio as unknown as HTMLAudioElement, s => states.push(s));
  return { audio, states, music };
}

test("room sound ignores previous zero-volume and mute preferences", async () => {
  const audio = new FakeAudio();
  audio.volume = 0; audio.muted = true;
  const music = new QuizMusic(audio as unknown as HTMLAudioElement, () => {});
  assert.equal(audio.volume, 1);
  assert.equal(audio.muted, false);
  assert.equal(music.requested, false);
  await music.play();
  assert.equal(music.requested, true);
  assert.equal(audio.volume, 1);
  music.dispose();
});

test("the real media play call starts inside the click stack before any await", async () => {
  const { audio, states, music } = setup();
  const pending = music.play();
  assert.equal(audio.playCalls, 1);
  assert.equal(audio.muted, false);
  assert.equal(audio.loop, true);
  assert.equal(audio.attributes.has("playsinline"), true);
  assert.equal(await pending, true);
  assert.equal(states.at(-1), "playing");
  music.dispose();
});

test("autoplay rejection shows a blocked state, and a later gesture can start music", async () => {
  const { audio, states, music } = setup();
  audio.start = () => Promise.reject(Object.assign(new Error("Gesture required"), { name: "NotAllowedError" }));
  assert.equal(await music.play(), false);
  assert.equal(states.at(-1), "blocked");
  assert.equal(states.includes("playing"), false);
  audio.start = async () => { audio.paused = false; audio.dispatchEvent(new Event("playing")); };
  assert.equal(await music.play(), true);
  assert.equal(states.at(-1), "playing");
  music.dispose();
});

test("turning sound off while play is pending prevents a late resume", async () => {
  const { audio, states, music } = setup();
  let release = () => {};
  audio.start = () => new Promise<void>(resolve => {
    release = () => { audio.paused = false; audio.dispatchEvent(new Event("playing")); resolve(); };
  });
  const pending = music.play();
  music.pause();
  release();
  assert.equal(await pending, false);
  assert.equal(audio.paused, true);
  assert.equal(states.at(-1), "off");
  music.dispose();
});

test("urgency changes tempo without restarting, pausing or resetting the audio", async () => {
  const { audio, music } = setup();
  await music.play();
  music.setUrgent(true);
  assert.equal(audio.playbackRate, 1.25);
  music.setUrgent(false);
  assert.equal(audio.playbackRate, 1);
  assert.equal(audio.playCalls, 1);
  assert.equal(audio.pauseCalls, 0);
  music.dispose();
});

test("dispose removes media callbacks and stops playback", async () => {
  const { audio, states, music } = setup();
  await music.play();
  music.dispose();
  const count = states.length;
  audio.dispatchEvent(new Event("playing"));
  audio.dispatchEvent(new Event("error"));
  assert.equal(states.length, count);
  assert.equal(audio.paused, true);
  assert.equal(await music.play(), false);
});

test("the deployed loop is a valid non-silent PCM WAV with no clipping", () => {
  const wav = readFileSync(new URL("../public/audio/quizpop-suspense-v2.wav", import.meta.url));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), wav.length - 44);
  let energy = 0, peak = 0;
  for (let i = 44; i < wav.length; i += 2) {
    const value = wav.readInt16LE(i) / 32768;
    energy += value * value; peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(energy / ((wav.length - 44) / 2));
  assert.ok(rms > .08 && peak < .9);
  assert.ok((wav.length - 44) / wav.readUInt32LE(28) > 15);
});

test("primary MP3 contains MPEG audio frames after its ID3 tag", () => {
  const bytes = readFileSync(new URL("../public/audio/quizpop-suspense-v3.mp3", import.meta.url));
  assert.equal(bytes.toString("ascii", 0, 3), "ID3");
  const tagSize = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
  const offset = 10 + tagSize;
  assert.equal(bytes[offset], 255);
  assert.equal(bytes[offset + 1] & 224, 224);
  assert.ok(bytes.length > 200000);
});

test("audio responses use explicit Safari-compatible MIME types", async () => {
  const rules = await config.headers!();
  for (const [extension, mime] of [["mp3", "audio/mpeg"], ["wav", "audio/wav"]]) {
    const rule = rules.find(r => r.source.endsWith("." + extension));
    assert.equal(rule?.headers.find(h => h.key === "Content-Type")?.value, mime);
  }
});
