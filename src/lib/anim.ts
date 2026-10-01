import {Easing, interpolate, random, spring} from 'remotion';

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const DEG = Math.PI / 180;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** a→b 帧之间从 0 走到 1（默认缓入缓出） */
export const prog = (
  f: number,
  a: number,
  b: number,
  easing: (t: number) => number = Easing.inOut(Easing.cubic),
) => interpolate(f, [a, b], [0, 1], {...CLAMP, easing});

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeOutBack = Easing.out(Easing.back(1.8));

/** 在 [a, b] 区间内可见，两端各 d 帧淡入淡出 */
export const inOut = (f: number, a: number, b: number, d = 8) =>
  Math.min(
    interpolate(f, [a, a + d], [0, 1], CLAMP),
    interpolate(f, [b - d, b], [1, 0], CLAMP),
  );

export const pop = (
  f: number,
  fps: number,
  at: number,
  config: {damping?: number; stiffness?: number; mass?: number} = {damping: 11, stiffness: 160, mass: 0.7},
) => spring({frame: f - at, fps, config});

/** 平滑一维噪声，返回 -1..1 */
export const vnoise = (seed: string, t: number) => {
  const i = Math.floor(t);
  const fr = t - i;
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  const s = fr * fr * (3 - 2 * fr);
  return a + (b - a) * s;
};

/** 冲击震屏：hits 为冲击发生的帧 */
export const shake = (f: number, hits: number[], amp = 26, decay = 6, seed = 'shk') => {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const h of hits) {
    const t = f - h;
    if (t < 0 || t > decay * 5) continue;
    const k = Math.exp(-t / decay) * amp;
    x += (random(`${seed}x${f}`) - 0.5) * 2 * k;
    y += (random(`${seed}y${f}`) - 0.5) * 2 * k;
    r += (random(`${seed}r${f}`) - 0.5) * k * 0.06;
  }
  return {x, y, r};
};

/** 冲击强度包络：在 hit 帧达到 1 后指数衰减 */
export const impulse = (f: number, hits: number[], decay = 6) => {
  let v = 0;
  for (const h of hits) {
    const t = f - h;
    if (t >= 0) v = Math.max(v, Math.exp(-t / decay));
  }
  return v;
};
