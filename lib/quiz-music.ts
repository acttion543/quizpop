export type MusicPlayback = "off" | "starting" | "playing" | "blocked" | "error";

// Use the browser's media playback path on iOS, rather than an ambient AudioContext.
export class QuizMusic {
  private wanted = false;
  private disposed = false;
  private attempt = 0;
  private listeners: [string, EventListener][] = [];
  constructor(
    readonly audio: HTMLAudioElement,
    private changed: (state: MusicPlayback) => void,
  ) {
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    this.listen("playing", () => {
      if (this.wanted) this.changed("playing");
      else audio.pause();
    });
    this.listen("pause", () => this.changed(this.wanted ? "blocked" : "off"));
    this.listen("waiting", () => { if (this.wanted) this.changed("starting"); });
    this.listen("error", () => { if (this.wanted) this.changed("error"); });
  }
  private listen(name: string, listener: EventListener) {
    this.listeners.push([name, listener]);
    this.audio.addEventListener(name, listener);
  }
  get playing() { return !this.audio.paused && !this.audio.ended && this.audio.readyState >= 3; }
  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  setUrgent(urgent: boolean) {
    this.audio.playbackRate = urgent ? 1.25 : 1;
  }
  async play(): Promise<boolean> {
    if (this.disposed) return false;
    this.wanted = true;
    const attempt = ++this.attempt;
    this.changed("starting");
    try {
      if (this.audio.error) this.audio.load();
      this.audio.muted = false;
      // Keep this call synchronous with click/touchend. No effect or await before play().
      const started = this.audio.play();
      await started;
      if (this.disposed) return false;
      if (!this.wanted) { this.audio.pause(); return false; }
      if (attempt !== this.attempt) return this.playing;
      const playing = this.playing;
      this.changed(playing ? "playing" : "blocked");
      return playing;
    } catch (error) {
      if (!this.disposed && this.wanted && attempt === this.attempt) {
        this.changed((error as { name?: string }).name === "NotAllowedError" ? "blocked" : "error");
      }
      return false;
    }
  }
  pause() {
    this.wanted = false;
    this.attempt++;
    this.audio.pause();
    if (!this.disposed) this.changed("off");
  }
  dispose() {
    this.disposed = true;
    for (const [name, listener] of this.listeners) this.audio.removeEventListener(name, listener);
    this.listeners = [];
    this.pause();
  }
}
