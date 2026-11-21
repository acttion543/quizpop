// An original, lightweight suspense loop generated locally. No external audio requests.
export class QuizMusic {
  readonly context: AudioContext;
  private master: GainNode;
  private timer: ReturnType<typeof setInterval> | undefined;
  private sources = new Set<OscillatorNode>();
  private step = 0;
  private nextBeat = 0;
  private urgent = false;
  private volume = .22;
  constructor(context: AudioContext) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
  }
  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.timer) this.master.gain.setTargetAtTime(this.volume * .28, this.context.currentTime, .03);
  }
  setUrgent(urgent: boolean) { this.urgent = urgent; }
  async unlock() {
    await this.context.resume();
    return this.context.state === "running";
  }
  private note(midi: number, when: number, length: number, level: number, type: OscillatorType = "triangle") {
    const ctx = this.context, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(level, when + .012);
    gain.gain.exponentialRampToValueAtTime(.001, when + length);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.sources.add(oscillator);
    oscillator.onended = () => { this.sources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when);
    oscillator.stop(when + length + .02);
  }
  play() {
    if (this.timer || this.context.state !== "running") return;
    this.step = 0;
    this.nextBeat = this.context.currentTime + .03;
    this.master.gain.setTargetAtTime(this.volume * .28, this.context.currentTime, .04);
    const schedule = () => {
      const now = this.context.currentTime;
      if (this.nextBeat < now) this.nextBeat = now + .02;
      while (this.nextBeat < now + .12) {
        const beat = 60 / (this.urgent ? 158 : 122) / 2;
        const melody = [60, 67, 72, 75, 67, 70, 74, 67, 60, 67, 72, 79, 75, 72, 70, 67];
        const bass = [36, 32, 39, 34][Math.floor(this.step / 8) % 4];
        this.note(melody[this.step % melody.length], this.nextBeat, beat * .7, .23);
        if (this.step % 2 === 0) this.note(bass, this.nextBeat, beat * 1.4, .38, "sine");
        if (this.step % 4 === 0) this.note(36, this.nextBeat, .1, .28, "sine");
        this.step++;
        this.nextBeat += beat;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 40);
  }
  pause() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setValueAtTime(0, this.context.currentTime);
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
  }
  dispose() {
    this.pause();
    this.master.disconnect();
    void this.context.close().catch(() => {});
  }
}
