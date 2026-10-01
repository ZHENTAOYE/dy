// 程序化合成整条配乐 + 音效（纯 JS DSP，无需任何音频素材），输出 public/audio/soundtrack.mp3
// 用法：node scripts/make-sfx.mjs        （需要本机有 ffmpeg）
//
// 时间点（帧）与各场景文件里的常量一一对应，修改动画节奏时请同步这里的 CUES。
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCENES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/scenes.json'), 'utf8'));
const FPS = 30;
const SR = 44100;

const START = {};
let acc = 0;
for (const s of SCENES) {
  START[s.key] = acc;
  acc += s.dur;
}
const TOTAL_FRAMES = acc;
const N = Math.ceil((TOTAL_FRAMES / FPS) * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const SL = new Float32Array(N); // 混响发送
const SRr = new Float32Array(N);

let seed = 20241209;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const T = (key, frame) => (START[key] + frame) / FPS;
const TAU = Math.PI * 2;

const put = (i, l, r, send = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += l;
  R[i] += r;
  if (send) {
    SL[i] += l * send;
    SRr[i] += r * send;
  }
};
const panLR = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

// ———————————————— 音色 ————————————————

/** 低频轰鸣冲击 */
const boom = (t, {amp = 1, f0 = 130, f1 = 34, dur = 1.6, noise = 0.5, send = 0.2} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let ph = 0;
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const f = f1 + (f0 - f1) * Math.exp(-tt * 8);
    ph += (TAU * f) / SR;
    const env = Math.exp((-tt * 3.5) / dur) * Math.min(1, tt * 600);
    const body = Math.tanh(Math.sin(ph) * env * 2.4) * 0.75;
    lp += (rnd() * 2 - 1 - lp) * 0.06;
    const thump = lp * Math.exp(-tt * 10) * noise * 4;
    const click = k < 200 ? (rnd() * 2 - 1) * (1 - k / 200) * 0.5 : 0;
    const v = (body + thump + click) * amp;
    put(i0 + k, v, v, send);
  }
};

/** 带通噪声扫频的“嗖”声 */
const whoosh = (t, {dur = 0.7, amp = 0.35, fA = 300, fB = 5000, pan = 0, spread = 0.9, send = 0.35, q = 0.3} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let low = 0;
  let band = 0;
  for (let k = 0; k < n; k++) {
    const x = k / n;
    const fc = fA * (fB / fA) ** x;
    const F = 2 * Math.sin((Math.PI * Math.min(fc, 7000)) / SR);
    const inp = rnd() * 2 - 1;
    low += F * band;
    const high = inp - low - q * band;
    band += F * high;
    const env = Math.sin(Math.PI * x ** 0.75) ** 2;
    const v = band * env * amp;
    const [gl, gr] = panLR(Math.max(-1, Math.min(1, pan + (x - 0.5) * spread)));
    put(i0 + k, v * gl, v * gr, send);
  }
};

/** 上升蓄力音（噪声 + 锯齿上滑） */
const riser = (t0, t1, {amp = 0.35, fA = 200, fB = 3500, send = 0.3} = {}) => {
  const i0 = Math.floor(t0 * SR);
  const n = Math.floor((t1 - t0) * SR);
  let low = 0;
  let band = 0;
  let ph = 0;
  let lp = 0;
  for (let k = 0; k < n; k++) {
    const x = k / n;
    const fc = fA * (fB / fA) ** x;
    const F = 2 * Math.sin((Math.PI * Math.min(fc, 7000)) / SR);
    low += F * band;
    const high = rnd() * 2 - 1 - low - 0.25 * band;
    band += F * high;
    ph += (TAU * (60 + 500 * x * x)) / SR;
    const saw = ((ph / TAU) % 1) * 2 - 1;
    lp += (saw - lp) * (0.02 + 0.2 * x);
    const env = x ** 2.2;
    const v = (band * 0.8 + lp * 0.35) * env * amp;
    const wob = Math.sin(k * 0.0004) * 0.4;
    const [gl, gr] = panLR(wob);
    put(i0 + k, v * gl, v * gr, send);
  }
};

/** 电流噼啪 */
const zap = (t, {dur = 0.22, amp = 0.28, pan = 0, send = 0.15} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let gate = 1;
  let f = 120;
  let ph = 0;
  let prev = 0;
  for (let k = 0; k < n; k++) {
    if (k % 300 === 0) {
      gate = rnd() < 0.55 ? 1 : 0.1;
      f = 80 + rnd() * 260;
    }
    ph += (TAU * f) / SR;
    const buzz = Math.sign(Math.sin(ph)) * 0.35;
    const w = rnd() * 2 - 1;
    const hp = w - prev;
    prev = w;
    const env = Math.exp((-k / n) * 4);
    const v = (buzz + hp * 0.6) * gate * env * amp;
    const [gl, gr] = panLR(pan);
    put(i0 + k, v * gl, v * gr, send);
  }
};

/** 数码故障声：随机方波碎片 */
const glitch = (t, {dur = 0.3, amp = 0.2, send = 0.1} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let f = 400;
  let on = 1;
  let ph = 0;
  let pan = 0;
  for (let k = 0; k < n; k++) {
    if (k % 1100 === 0) {
      f = 150 + rnd() * 2400;
      on = rnd() < 0.75 ? 1 : 0;
      pan = rnd() * 1.6 - 0.8;
    }
    ph += (TAU * f) / SR;
    let v = Math.sign(Math.sin(ph)) * on;
    v = Math.round(v * 3) / 3;
    v *= amp * (1 - (k / n) * 0.6);
    const [gl, gr] = panLR(pan);
    put(i0 + k, v * gl, v * gr, send);
  }
};

/** 短促电子音 */
const blip = (t, {f0 = 1200, f1 = 600, dur = 0.09, amp = 0.18, pan = 0, send = 0.25, square = false} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const x = k / n;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-x * 5))) / SR;
    const s = square ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph);
    const env = Math.min(1, k / 80) * (1 - x) ** 2;
    const v = s * env * amp;
    const [gl, gr] = panLR(pan);
    put(i0 + k, v * gl, v * gr, send);
  }
};

/** 钟声 / 晶体音 */
const bell = (t, {f = 880, amp = 0.2, dur = 2.2, pan = 0, send = 0.55} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(dur * SR);
  const parts = [
    [1, 1, 1.0],
    [2.0, 0.5, 1.6],
    [2.76, 0.35, 2.4],
    [5.4, 0.18, 4],
  ];
  const [gl, gr] = panLR(pan);
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    let s = 0;
    for (const [m, a, d] of parts) s += Math.sin(TAU * f * m * tt) * a * Math.exp((-tt * d * 2.2) / dur);
    const v = s * Math.min(1, k / 60) * amp;
    put(i0 + k, v * gl, v * gr, send);
  }
};

const chord = (t, freqs, {amp = 0.12, gap = 0.07, send = 0.6} = {}) =>
  freqs.forEach((f, i) => bell(t + i * gap, {f, amp, pan: (i / Math.max(1, freqs.length - 1)) * 1.2 - 0.6, send}));

/** 警报嘀嘀 */
const alarm = (t, {amp = 0.16, n = 2} = {}) => {
  for (let i = 0; i < n; i++) {
    blip(t + i * 0.16, {f0: 1050, f1: 760, dur: 0.12, amp, square: true, send: 0.2});
  }
};

/** 清脆的咔哒 */
const click = (t, {amp = 0.3} = {}) => {
  blip(t, {f0: 3200, f1: 1400, dur: 0.035, amp, send: 0.2});
  boom(t, {amp: amp * 0.35, f0: 220, f1: 90, dur: 0.18, noise: 0.2, send: 0.05});
};

/** 玻璃碎裂 */
const shatter = (t, {amp = 0.45} = {}) => {
  const i0 = Math.floor(t * SR);
  const n = Math.floor(1.2 * SR);
  let prev = 0;
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const w = rnd() * 2 - 1;
    const hp = w - prev * 0.9;
    prev = w;
    const grains = rnd() < 0.02 * Math.exp(-tt * 3) ? 1 : 0;
    const v = (hp * Math.exp(-tt * 5) * 0.5 + grains * (rnd() * 2 - 1) * 2) * amp;
    const p = rnd() * 1.4 - 0.7;
    const [gl, gr] = panLR(p);
    put(i0 + k, v * gl, v * gr, 0.4);
  }
  for (let i = 0; i < 6; i++) bell(t + rnd() * 0.25, {f: 2200 + rnd() * 3000, amp: 0.05, dur: 0.6, pan: rnd() * 1.6 - 0.8, send: 0.6});
};

/** 雷击：先劈裂，后轰鸣 */
const thunder = (t, {amp = 0.6} = {}) => {
  zap(t, {dur: 0.15, amp: amp * 0.7});
  shatter(t, {amp: amp * 0.5});
  boom(t + 0.02, {amp, f0: 160, f1: 30, dur: 2.0, noise: 0.9, send: 0.35});
};

// ———————————————— 氛围铺底 ————————————————

const PADS = {
  hook: [55, 82.41, 110, 130.81],
  qubit: [43.65, 65.41, 87.31, 110, 130.81],
  noise: [55, 77.78, 116.54, 82.41],
  classical: [65.41, 98, 130.81, 164.81],
  walls: [51.91, 73.42, 110, 77.78],
  trick: [73.42, 110, 146.83, 185],
  surface: [41.2, 61.74, 82.41, 98, 123.47],
  threshold: [49, 73.42, 98, 123.47, 146.83],
  outro: [55, 82.41, 110, 138.59, 164.81],
};
const DANGER = {noise: 1, walls: 1};

const pad = () => {
  const xf = Math.floor(1.0 * SR);
  for (const s of SCENES) {
    const notes = PADS[s.key];
    const a = Math.floor((START[s.key] / FPS) * SR) - xf / 2;
    const b = Math.floor(((START[s.key] + s.dur) / FPS) * SR) + xf / 2;
    const danger = DANGER[s.key] ?? 0;
    notes.forEach((f, ni) => {
      for (const det of [-0.12, 0.13]) {
        let ph = rnd() * TAU;
        let lp1 = 0;
        let lp2 = 0;
        const pan = (ni / notes.length - 0.5) * 0.9 + det;
        const [gl, gr] = panLR(pan);
        for (let i = Math.max(0, a); i < Math.min(N, b); i++) {
          const tt = i / SR;
          ph += (TAU * (f * (1 + det / 100))) / SR;
          const saw = ((ph / TAU) % 1) * 2 - 1;
          const cut = 0.03 + 0.035 * (0.5 + 0.5 * Math.sin(tt * 0.35 + ni));
          lp1 += (saw - lp1) * cut;
          lp2 += (lp1 - lp2) * cut;
          let env = Math.min(1, (i - a) / xf, (b - i) / xf);
          env = Math.max(0, env);
          const trem = danger ? 0.75 + 0.25 * Math.sin(tt * TAU * 5.5) : 1;
          const v = lp2 * env * trem * 0.075;
          put(i, v * gl, v * gr, 0.25);
        }
      }
    });
  }
  // 结尾整体淡出
  const fadeN = Math.floor(0.8 * SR);
  for (let i = N - fadeN; i < N; i++) {
    const g = (N - i) / fadeN;
    L[i] *= g;
    R[i] *= g;
    SL[i] *= g;
    SRr[i] *= g;
  }
};

// ———————————————— 时间轴音效 CUES ————————————————

const CUES = () => {
  // 场景切换的嗖声
  for (const s of SCENES.slice(1)) whoosh(T(s.key, -12), {dur: 0.55, amp: 0.3, fA: 250, fB: 6000});

  // S1 开场
  bell(T('hook', 4), {f: 1318.5, amp: 0.1, dur: 2.5, send: 0.7});
  bell(T('hook', 10), {f: 1975.5, amp: 0.06, dur: 2.5, pan: 0.4, send: 0.7});
  glitch(T('hook', 72), {dur: 0.35, amp: 0.25});
  boom(T('hook', 72), {amp: 0.7, dur: 1.2});
  [80, 90, 97, 106, 112, 119, 124, 128].forEach((z, i) => zap(T('hook', z), {pan: i % 2 ? 0.5 : -0.5, amp: 0.22}));
  shatter(T('hook', 132), {amp: 0.55});
  boom(T('hook', 132), {amp: 0.8, f0: 180, dur: 1.4});
  riser(T('hook', 116), T('hook', 143), {amp: 0.35});
  boom(T('hook', 144), {amp: 1.1, f0: 150, f1: 28, dur: 2.8, noise: 0.8, send: 0.4});
  chord(T('hook', 146), [440, 659.25, 880, 1318.5], {amp: 0.08});
  whoosh(T('hook', 168), {dur: 0.6, amp: 0.2, fA: 2000, fB: 400});

  // S2 量子比特
  blip(T('qubit', 40), {f0: 900, f1: 300, dur: 0.18, amp: 0.2});
  blip(T('qubit', 74), {f0: 300, f1: 900, dur: 0.18, amp: 0.2});
  boom(T('qubit', 50), {amp: 0.35, f0: 200, f1: 60, dur: 0.5});
  boom(T('qubit', 84), {amp: 0.35, f0: 200, f1: 60, dur: 0.5});
  [0, 1, 2, 3, 4, 5].forEach((k) => bell(T('qubit', 104 + k * 4), {f: [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98][k], amp: 0.06, dur: 1.6, pan: k / 3 - 0.8}));
  whoosh(T('qubit', 104), {dur: 1.2, amp: 0.2, fA: 600, fB: 3000, spread: 1.6});
  chord(T('qubit', 200), [349.23, 440, 523.25, 698.46], {amp: 0.08});
  bell(T('qubit', 270), {f: 1046.5, amp: 0.07});

  // S3 噪声
  [18, 36, 54, 72].forEach((a, i) => whoosh(T('noise', a), {dur: 0.45, amp: 0.22, pan: i % 2 ? 0.7 : -0.7, spread: i % 2 ? -0.8 : 0.8}));
  [32, 50, 68, 86].forEach((h, i) => {
    zap(T('noise', h - 2), {amp: 0.3, pan: i % 2 ? 0.5 : -0.5});
    boom(T('noise', h), {amp: 0.45, f0: 170, f1: 50, dur: 0.7});
  });
  [104, 113, 121, 128, 136, 143, 151, 158, 166, 174, 182].forEach((z, i) => zap(T('noise', z), {amp: 0.16, dur: 0.12, pan: (i % 3) - 1}));
  boom(T('noise', 128), {amp: 0.85, f0: 120, f1: 25, dur: 2.4, noise: 0.6});
  glitch(T('noise', 128), {dur: 0.5, amp: 0.2});
  riser(T('noise', 96), T('noise', 127), {amp: 0.25, fA: 150, fB: 2000});
  [222, 248, 274].forEach((t) => blip(T('noise', t), {f0: 900, f1: 260, dur: 0.16, amp: 0.16, pan: -0.5}));
  [235, 261, 287].forEach((t) => blip(T('noise', t), {f0: 520, f1: 520 * 0.7, dur: 0.16, amp: 0.16, pan: 0.5, square: true}));
  whoosh(T('noise', 304), {dur: 0.8, amp: 0.2, fA: 3000, fB: 300});
  blip(T('noise', 322), {f0: 300, f1: 220, dur: 0.25, amp: 0.2, square: true});
  bell(T('noise', 344), {f: 1567.98, amp: 0.08});
  riser(T('noise', 358), T('noise', 383), {amp: 0.25});
  boom(T('noise', 384), {amp: 0.95, f0: 140, f1: 30, dur: 2.2});
  glitch(T('noise', 384), {dur: 0.25, amp: 0.15});

  // S4 经典纠错
  blip(T('classical', 4), {f0: 700, f1: 1100, dur: 0.12, amp: 0.15});
  whoosh(T('classical', 44), {dur: 0.4, amp: 0.25, pan: -0.6, spread: -0.6, fA: 800, fB: 3000});
  whoosh(T('classical', 44), {dur: 0.4, amp: 0.25, pan: 0.6, spread: 0.6, fA: 800, fB: 3000});
  [46, 50].forEach((t) => blip(T('classical', t), {f0: 1100, f1: 900, dur: 0.08, amp: 0.12}));
  thunder(T('classical', 104), {amp: 0.75});
  glitch(T('classical', 107), {dur: 0.25, amp: 0.15});
  [152, 156, 160].forEach((t, i) => blip(T('classical', t), {f0: i === 1 ? 500 : 900, f1: i === 1 ? 400 : 900, dur: 0.07, amp: 0.13}));
  bell(T('classical', 178), {f: 987.77, amp: 0.1});
  chord(T('classical', 200), [523.25, 659.25, 783.99, 1046.5], {amp: 0.09});
  boom(T('classical', 200), {amp: 0.4, f0: 150, f1: 60, dur: 0.8});
  blip(T('classical', 226), {f0: 600, f1: 900, dur: 0.2, amp: 0.1});

  // S5 三道难关
  boom(T('walls', 6), {amp: 1.0, f0: 120, f1: 28, dur: 2});
  glitch(T('walls', 6), {dur: 0.45, amp: 0.25});
  [50, 124, 198].forEach((t, i) => {
    whoosh(T('walls', t - 6), {dur: 0.35, amp: 0.25, pan: 0.8, spread: -1.2, fA: 400, fB: 4000});
    boom(T('walls', t), {amp: 0.7, f0: 190, f1: 45, dur: 1.0, noise: 0.9});
    blip(T('walls', t + 1), {f0: 180 - i * 20, f1: 120, dur: 0.35, amp: 0.15, square: true, send: 0.4});
  });
  boom(T('walls', 268), {amp: 0.6, f0: 70, f1: 30, dur: 3});
  glitch(T('walls', 270), {dur: 0.6, amp: 0.12});

  // S6 妙招
  riser(T('trick', 26), T('trick', 120), {amp: 0.12, fA: 300, fB: 1500});
  blip(T('trick', 56), {f0: 1400, f1: 900, dur: 0.12, amp: 0.18, pan: -0.2});
  blip(T('trick', 85), {f0: 1700, f1: 1100, dur: 0.12, amp: 0.18, pan: 0.2});
  chord(T('trick', 128), [587.33, 739.99, 880, 1174.66], {amp: 0.09});
  boom(T('trick', 128), {amp: 0.5, f0: 150, f1: 50, dur: 1.0});
  blip(T('trick', 176), {f0: 260, f1: 200, dur: 0.22, amp: 0.15, square: true});
  [240, 245, 250, 255].forEach((t) => blip(T('trick', t), {f0: 1500, f1: 1500, dur: 0.04, amp: 0.06}));
  [256, 262].forEach((t) => blip(T('trick', t), {f0: 1320, f1: 1320, dur: 0.1, amp: 0.12}));
  thunder(T('trick', 284), {amp: 0.7});
  [318, 323, 328, 333].forEach((t) => blip(T('trick', t), {f0: 1500, f1: 1500, dur: 0.04, amp: 0.06}));
  alarm(T('trick', 334), {n: 3});
  click(T('trick', 366));
  bell(T('trick', 366), {f: 1174.66, amp: 0.08});
  riser(T('trick', 376), T('trick', 393), {amp: 0.25, fA: 400, fB: 5000});
  boom(T('trick', 394), {amp: 0.6, f0: 160, f1: 50, dur: 1.2});
  chord(T('trick', 394), [587.33, 880, 1174.66, 1479.98], {amp: 0.1});
  bell(T('trick', 448), {f: 1479.98, amp: 0.08});
  bell(T('trick', 452), {f: 2217.46, amp: 0.05, pan: 0.5});
  [508, 516, 524, 532].forEach((t, i) => blip(T('trick', t), {f0: 700 + i * 30, f1: 650, dur: 0.05, amp: 0.05}));
  click(T('trick', 545), {amp: 0.45});
  bell(T('trick', 546), {f: 1760, amp: 0.08});

  // S7 表面码
  boom(T('surface', 2), {amp: 0.8, f0: 140, f1: 32, dur: 1.8});
  glitch(T('surface', 2), {dur: 0.2, amp: 0.15});
  for (let k = 0; k < 14; k++) blip(T('surface', 12 + k * 3), {f0: 900 + k * 70, f1: 800 + k * 70, dur: 0.05, amp: 0.05, pan: (k % 5) / 2.5 - 0.8});
  [104, 119, 134, 149].forEach((t, i) => blip(T('surface', t), {f0: i % 2 ? 780 : 1040, f1: i % 2 ? 760 : 1020, dur: 0.12, amp: 0.1}));
  [176, 236].forEach((t) => {
    zap(T('surface', t), {amp: 0.25});
    boom(T('surface', t + 3), {amp: 0.45, f0: 180, f1: 55, dur: 0.6});
    alarm(T('surface', t + 6), {amp: 0.1});
  });
  riser(T('surface', 290), T('surface', 322), {amp: 0.2, fA: 500, fB: 4000});
  boom(T('surface', 324), {amp: 0.7, f0: 150, f1: 40, dur: 1.4});
  chord(T('surface', 324), [329.63, 493.88, 659.25, 987.77], {amp: 0.1});
  whoosh(T('surface', 360), {dur: 0.6, amp: 0.2, fA: 3000, fB: 400});
  [370, 382, 394].forEach((t, i) => {
    blip(T('surface', t), {f0: 400 + i * 200, f1: 300 + i * 150, dur: 0.12, amp: 0.15});
    boom(T('surface', t), {amp: 0.25 + i * 0.1, f0: 160, f1: 60, dur: 0.5});
  });
  [420, 428, 436].forEach((t, i) => bell(T('surface', t), {f: [659.25, 783.99, 987.77][i], amp: 0.08}));

  // S8 阈值
  blip(T('threshold', 46), {f0: 400, f1: 900, dur: 0.6, amp: 0.06});
  blip(T('threshold', 62), {f0: 450, f1: 1100, dur: 0.6, amp: 0.06});
  blip(T('threshold', 78), {f0: 500, f1: 1300, dur: 0.6, amp: 0.06});
  boom(T('threshold', 108), {amp: 0.6, f0: 160, f1: 45, dur: 1.2});
  bell(T('threshold', 108), {f: 783.99, amp: 0.1});
  bell(T('threshold', 162), {f: 987.77, amp: 0.07});
  bell(T('threshold', 172), {f: 1174.66, amp: 0.06});
  blip(T('threshold', 228), {f0: 300, f1: 180, dur: 0.3, amp: 0.15, square: true});
  riser(T('threshold', 246), T('threshold', 269), {amp: 0.28});
  boom(T('threshold', 270), {amp: 0.95, f0: 140, f1: 28, dur: 2.4});
  [306, 318, 330].forEach((t, i) => blip(T('threshold', t), {f0: 900 - i * 150, f1: 700 - i * 150, dur: 0.14, amp: 0.14}));
  click(T('threshold', 334), {amp: 0.4});
  chord(T('threshold', 336), [392, 493.88, 587.33, 783.99], {amp: 0.09});
  bell(T('threshold', 386), {f: 1567.98, amp: 0.07});

  // S9 结尾
  for (let k = 0; k < 12; k++) bell(T('outro', 4 + k * 6), {f: 1200 + rnd() * 2400, amp: 0.025, dur: 1.2, pan: rnd() * 1.6 - 0.8});
  riser(T('outro', 88), T('outro', 165), {amp: 0.45, fA: 120, fB: 6000});
  boom(T('outro', 166), {amp: 1.15, f0: 150, f1: 26, dur: 3, noise: 0.9, send: 0.45});
  shatter(T('outro', 166), {amp: 0.25});
  chord(T('outro', 168), [440, 554.37, 659.25, 880, 1108.73], {amp: 0.09});
  riser(T('outro', 182), T('outro', 197), {amp: 0.25});
  boom(T('outro', 198), {amp: 0.9, f0: 130, f1: 30, dur: 2.6, send: 0.4});
  chord(T('outro', 200), [220, 329.63, 440, 554.37, 880], {amp: 0.1, gap: 0.03});
};

// ———————————————— 混响（Schroeder） ————————————————

const reverb = (inp, combs, aps) => {
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.7 + lp * 0.3;
      buf[idx] = inp[i] + lp * 0.84;
      out[i] += y / combs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const d of aps) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const x = out[i];
      const y = -x * 0.5 + b;
      buf[idx] = x + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
};

// ———————————————— 渲染 ————————————————

console.log(`合成 ${(N / SR).toFixed(1)} 秒音频…`);
pad();
CUES();
const wetL = reverb(SL, [1557, 1617, 1491, 1422, 1277, 1356], [225, 556]);
const wetR = reverb(SRr, [1580, 1640, 1514, 1445, 1300, 1379], [248, 579]);

let peak = 0;
const mixL = new Float32Array(N);
const mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  mixL[i] = L[i] + wetL[i] * 0.9;
  mixR[i] = R[i] + wetR[i] * 0.9;
  peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
}
// 归一化 + 软限幅
const gain = 2.2 / peak;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const l = Math.tanh(mixL[i] * gain) * 0.93;
  const r = Math.tanh(mixR[i] * gain) * 0.93;
  pcm.writeInt16LE(Math.round(l * 32767), i * 4);
  pcm.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const tmp = path.join(os.tmpdir(), `qec-soundtrack-${process.pid}.wav`);
fs.writeFileSync(tmp, Buffer.concat([header, pcm]));
const out = path.join(ROOT, 'public/audio/soundtrack.mp3');
fs.mkdirSync(path.dirname(out), {recursive: true});
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '192k', out]);
fs.unlinkSync(tmp);
console.log(`✓ ${path.relative(ROOT, out)}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
