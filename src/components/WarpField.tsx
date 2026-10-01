import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ParticleLayer} from '../lib/ParticleLayer';
import {makeCamera, V3} from '../lib/math';
import {mulberry32} from '../lib/random';
import {starTint} from './StarField';

const DEPTH = 240;

type Props = {
  travel: number; // distance flown so far (world units)
  speed: number; // distance per frame, sets the streak length
  seed?: number;
  count?: number;
  brightness?: number;
  // per-star ignition frames (first stars switching on)
  ignite?: {from: number; to: number};
  hue?: 'stars' | 'blue';
  roll?: number;
  hdr?: number;
};

// An endless tunnel of stars in front of the camera; with speed it becomes a warp jump.
export const WarpField: React.FC<Props> = ({travel, speed, seed = 3, count = 9000, brightness = 1, ignite, hue = 'stars', roll = 0, hdr = 1}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const base = useMemo(() => {
    const rnd = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const t0 = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // keep a clear corridor around the flight path so streaks fan out radially
      const a = rnd() * Math.PI * 2;
      const rr = 1.5 + Math.pow(rnd(), 0.7) * 70;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = Math.sin(a) * rr;
      pos[i * 3 + 2] = -rnd() * DEPTH;
      const m = Math.pow(rnd(), 6);
      const tint: V3 = hue === 'blue' ? [0.65 + 0.2 * rnd(), 0.8 + 0.1 * rnd(), 1] : starTint(rnd());
      const b = 0.4 + 2.2 * m;
      col.set([tint[0] * b, tint[1] * b, tint[2] * b], i * 3);
      size[i] = 0.06 + m * 0.25;
      t0[i] = rnd();
    }
    return {pos, col, size, t0};
  }, [seed, count, hue]);

  const {p, q, c} = useMemo(() => {
    const p = new Float32Array(count * 3);
    const q = new Float32Array(count * 3);
    const c = ignite ? new Float32Array(count * 3) : base.col;
    for (let i = 0; i < count; i++) {
      const z = ((base.pos[i * 3 + 2] + travel) % DEPTH + DEPTH) % DEPTH - DEPTH;
      p[i * 3] = base.pos[i * 3];
      p[i * 3 + 1] = base.pos[i * 3 + 1];
      p[i * 3 + 2] = z;
      q[i * 3] = base.pos[i * 3];
      q[i * 3 + 1] = base.pos[i * 3 + 1];
      q[i * 3 + 2] = z - speed * 1.2;
      if (ignite) {
        const at = ignite.from + base.t0[i] * (ignite.to - ignite.from);
        const k = f < at ? 0 : 0.7 + 4 * Math.exp(-(f - at) / 5);
        c[i * 3] = base.col[i * 3] * k;
        c[i * 3 + 1] = base.col[i * 3 + 1] * k;
        c[i * 3 + 2] = base.col[i * 3 + 2] * k;
      }
    }
    return {p, q, c};
  }, [base, travel, speed, ignite, f, count]);

  const camera = makeCamera({eye: [0, 0, 0], target: [0, 0, -1], up: [Math.sin(roll), Math.cos(roll), 0], fov: 60, near: 0.01, far: 1000}, width, height);
  return (
    <ParticleLayer
      camera={camera}
      hdr={hdr}
      sets={[
        {
          positions: p,
          prev: q,
          colors: c,
          sizes: base.size,
          intensity: brightness,
          minPx: 0.9,
          maxPx: 9,
          halo: 0.8,
          streakDim: 0.35,
          nearFade: [0.5, 4],
          farFade: [DEPTH * 0.7, DEPTH],
        },
      ]}
    />
  );
};
