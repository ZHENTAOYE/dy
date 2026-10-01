import {gauss, mulberry32} from './random';
import {V3} from './math';

// A particle galaxy stored in cylindrical coordinates so it can rotate differentially.
export type Cloud = {
  n: number;
  r: Float32Array;
  th: Float32Array;
  z: Float32Array;
  // optional per-particle offset along x (bar) in the rotating frame
  bx: Float32Array;
  col: Float32Array;
  size: Float32Array;
};

export type Galaxy = {stars: Cloud; dust: Cloud; hii: Cloud; radius: number};

type Opts = {
  seed: number;
  radius: number; // world units
  stars: number;
  dust?: number;
  hii?: number;
  arms?: number;
  pitchDeg?: number;
  armFrac?: number;
  bulgeFrac?: number;
  sizeMul?: number;
  // overall hue shift: 0 = Milky Way like, 1 = bluer, -1 = warmer
  tone?: number;
};

const cloud = (n: number): Cloud => ({
  n,
  r: new Float32Array(n),
  th: new Float32Array(n),
  z: new Float32Array(n),
  bx: new Float32Array(n),
  col: new Float32Array(n * 3),
  size: new Float32Array(n),
});

export const makeGalaxy = (o: Opts): Galaxy => {
  const rnd = mulberry32(o.seed);
  const R = o.radius;
  const arms = o.arms ?? 4;
  const pitch = ((o.pitchDeg ?? 13) * Math.PI) / 180;
  const k = 1 / Math.tan(pitch);
  const armFrac = o.armFrac ?? 0.62;
  const bulgeFrac = o.bulgeFrac ?? 0.16;
  const sm = (o.sizeMul ?? 1) * R * 0.0032;
  const tone = o.tone ?? 0;
  const r0 = R * 0.08;
  const armAngle = (r: number, arm: number) => Math.log(Math.max(r, r0) / r0) * k + (arm * Math.PI * 2) / arms;

  const stars = cloud(o.stars);
  for (let i = 0; i < o.stars; i++) {
    const u = rnd();
    let r: number;
    let th: number;
    let z: number;
    let c: V3;
    let size: number;
    if (u < bulgeFrac) {
      // bar + bulge: a warm, elongated ellipsoid
      const x = gauss(rnd) * R * 0.11;
      const y = gauss(rnd) * R * 0.045;
      r = Math.hypot(x, y);
      th = Math.atan2(y, x) + 0.47;
      z = gauss(rnd) * R * 0.035 * Math.exp(-r / (R * 0.2));
      const b = 0.3 + rnd() * 0.45;
      c = [1.0 * b, 0.78 * b, 0.52 * b];
      size = sm * (0.8 + rnd() * 1.4);
    } else {
      r = Math.min(-Math.log(1 - rnd() * 0.995) * R * 0.3 + R * 0.05, R * 1.15);
      const onArm = rnd() < armFrac;
      // major arms (0 and 2) are richer than minor ones
      let arm = Math.floor(rnd() * arms);
      if (arms === 4 && rnd() < 0.45) arm = arm & ~1;
      // feathered arms: most stars hug the arm, some drift into spurs between arms
      const feather = rnd() < 0.3 ? 2.6 : 1;
      const spread = onArm ? gauss(rnd) * (0.17 + 0.1 * (1 - r / R)) * feather : rnd() * Math.PI * 2;
      th = armAngle(r, arm) + spread;
      z = gauss(rnd) * R * (0.006 + 0.012 * (r / R));
      const young = onArm && Math.abs(spread) < 0.12 && rnd() < 0.6;
      const b = (young ? 0.45 + rnd() * 0.7 : 0.22 + rnd() * 0.45) * (0.6 + 0.4 * Math.exp(-r / R));
      c = young ? [0.62 * b, 0.76 * b, 1.0 * b] : [1.0 * b, 0.88 * b, 0.72 * b];
      size = sm * (young ? 0.8 + rnd() * 1.4 : 0.6 + rnd() * 0.9);
    }
    if (tone) {
      c = [c[0] * (1 - tone * 0.25), c[1], c[2] * (1 + tone * 0.25)];
    }
    stars.r[i] = r;
    stars.th[i] = th;
    stars.z[i] = z;
    stars.col.set(c, i * 3);
    stars.size[i] = size;
  }

  const nd = o.dust ?? 0;
  const dust = cloud(nd);
  for (let i = 0; i < nd; i++) {
    const r = R * 0.12 + Math.pow(rnd(), 0.8) * R * 0.85;
    const arm = Math.floor(rnd() * arms);
    // dust lanes trail on the inner edge of the arms
    const th = armAngle(r, arm) - 0.14 + gauss(rnd) * 0.1 * (rnd() < 0.3 ? 2.5 : 1);
    dust.r[i] = r;
    dust.th[i] = th;
    dust.z[i] = gauss(rnd) * R * 0.004;
    const b = 0.025 + rnd() * 0.045;
    dust.col.set([b * 0.8, b * 0.9, b * 1.05], i * 3);
    dust.size[i] = sm * (2.5 + rnd() * 4);
  }

  const nh = o.hii ?? 0;
  const hii = cloud(nh);
  let clumpR = 0;
  let clumpT = 0;
  for (let i = 0; i < nh; i++) {
    if (i % 24 === 0) {
      clumpR = R * 0.2 + rnd() * R * 0.75;
      clumpT = armAngle(clumpR, Math.floor(rnd() * arms)) + gauss(rnd) * 0.09;
    }
    const rr = clumpR + gauss(rnd) * R * 0.012;
    hii.r[i] = rr;
    hii.th[i] = clumpT + (gauss(rnd) * R * 0.012) / Math.max(rr, 1e-3);
    hii.z[i] = gauss(rnd) * R * 0.003;
    const b = 0.15 + rnd() * 0.35;
    hii.col.set([1.0 * b, 0.32 * b, 0.55 * b], i * 3);
    hii.size[i] = sm * (2 + rnd() * 3);
  }
  return {stars, dust, hii, radius: R};
};

export type Placement = {center: V3; tiltX: number; tiltZ: number; spin: number};

// Writes world positions for time `t` (rotation angle at the outer disk, radians).
export const placeCloud = (c: Cloud, R: number, t: number, pl: Placement, out: Float32Array) => {
  const cx = Math.cos(pl.tiltX);
  const sx = Math.sin(pl.tiltX);
  const cz = Math.cos(pl.tiltZ);
  const sz = Math.sin(pl.tiltZ);
  for (let i = 0; i < c.n; i++) {
    const r = c.r[i];
    // flat rotation curve outside the core, solid body inside
    const w = t / Math.max(r / R, 0.12);
    const th = c.th[i] + w + pl.spin;
    let x = Math.cos(th) * r;
    let y = c.z[i];
    let z = Math.sin(th) * r;
    // tilt around x then z
    const y1 = cx * y - sx * z;
    const z1 = sx * y + cx * z;
    y = y1;
    z = z1;
    const x2 = cz * x - sz * y;
    const y2 = sz * x + cz * y;
    x = x2;
    y = y2;
    out[i * 3] = x + pl.center[0];
    out[i * 3 + 1] = y + pl.center[1];
    out[i * 3 + 2] = z + pl.center[2];
  }
  return out;
};

export const placePoint = (r: number, th0: number, R: number, t: number, pl: Placement): V3 => {
  const w = t / Math.max(r / R, 0.12);
  const th = th0 + w + pl.spin;
  const x = Math.cos(th) * r;
  const z0 = Math.sin(th) * r;
  const y1 = -Math.sin(pl.tiltX) * z0;
  const z1 = Math.cos(pl.tiltX) * z0;
  return [Math.cos(pl.tiltZ) * x - Math.sin(pl.tiltZ) * y1 + pl.center[0], Math.sin(pl.tiltZ) * x + Math.cos(pl.tiltZ) * y1 + pl.center[1], z1 + pl.center[2]];
};
