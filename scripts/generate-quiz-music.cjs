// Original QuizPop suspense loop. Run: node scripts/generate-quiz-music.cjs
const fs = require("node:fs");
const path = require("node:path");
const sampleRate = 22050;
const beat = 60 / 122 / 2;
const length = Math.round(64 * beat * sampleRate);
const samples = new Float64Array(length);
const melody = [60, 67, 72, 75, 67, 70, 74, 67, 60, 67, 72, 79, 75, 72, 70, 67];
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
let randomState = 543;
function random() {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296 * 2 - 1;
}
function note(midi, start, duration, gain, wave = "triangle") {
  const count = Math.ceil(duration * sampleRate);
  const offset = Math.round(start * sampleRate);
  const hz = frequency(midi);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / .009) * (1 - t / duration) ** 2;
    const sine = Math.sin(2 * Math.PI * hz * t);
    const tone = wave === "sine" ? sine : 2 / Math.PI * Math.asin(sine);
    samples[(offset + i) % length] += tone * envelope * gain;
  }
}
for (let step = 0; step < 64; step++) {
  const when = step * beat;
  note(melody[step % 16], when, beat * .85, .3);
  if (step % 2 === 0) note([36, 32, 39, 34][Math.floor(step / 8) % 4], when, beat * 1.7, .4, "sine");
  // Quiet percussion keeps the pulse audible on small phone speakers.
  const offset = Math.round(when * sampleRate);
  for (let i = 0; i < sampleRate * .045; i++) {
    const t = i / sampleRate;
    samples[(offset + i) % length] += random() * Math.exp(-t * 120) * .06;
  }
  if (step % 4 === 0) {
    for (let i = 0; i < sampleRate * .15; i++) {
      const t = i / sampleRate;
      samples[(offset + i) % length] += Math.sin(2 * Math.PI * (48 * t + 7 * (1 - Math.exp(-t * 20)))) * Math.exp(-t * 25) * .28;
    }
  }
}
let peak = 0;
for (const value of samples) peak = Math.max(peak, Math.abs(value));
const wav = Buffer.alloc(44 + length * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(length * 2, 40);
let energy = 0;
for (let i = 0; i < length; i++) {
  const value = samples[i] / peak * .82;
  energy += value * value;
  wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
}
const output = path.resolve(__dirname, "../public/audio/quizpop-suspense-v2.wav");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, wav);
console.log(JSON.stringify({ output: path.basename(output), bytes: wav.length, durationSeconds: length / sampleRate, peak: .82, rms: Math.sqrt(energy / length) }));
