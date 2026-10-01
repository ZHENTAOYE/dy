import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ParticleLayer} from '../lib/ParticleLayer';
import {makeCamera, V3} from '../lib/math';
import {mulberry32, onSphere} from '../lib/random';

// Star colors weighted toward the yellow-white main sequence with a few blue and red giants.
export const starTint = (t: number): V3 => {
  if (t < 0.12) return [1.0, 0.55, 0.35];
  if (t < 0.35) return [1.0, 0.82, 0.62];
  if (t < 0.75) return [1.0, 0.96, 0.9];
  return [0.7, 0.82, 1.0];
};

type Props = {
  seed?: number;
  count?: number;
  yaw?: number; // radians
  pitch?: number;
  roll?: number;
  fov?: number;
  brightness?: number;
  // Concentrate a fraction of stars into a band (a galactic plane) for a richer sky.
  band?: number;
  twinkle?: number;
  sizeMul?: number;
  // Optional forward speed: stars become streaks (warp effect). Units: fraction of sphere radius per frame.
  warp?: number;
  style?: React.CSSProperties;
};

export const StarField: React.FC<Props> = ({
  seed = 1,
  count = 9000,
  yaw = 0,
  pitch = 0,
  roll = 0,
  fov = 60,
  brightness = 1,
  band = 0.35,
  twinkle = 0.25,
  sizeMul = 1,
  warp = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const data = useMemo(() => {
    const rnd = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let d = onSphere(rnd);
      if (rnd() < band) {
        // squash toward a tilted great circle
        const y = d[1] * 0.12;
        const l = Math.hypot(d[0], y, d[2]);
        d = [d[0] / l, y / l, d[2] / l];
        const c = Math.cos(0.5);
        const s = Math.sin(0.5);
        d = [d[0], c * d[1] - s * d[2], s * d[1] + c * d[2]];
      }
      pos[i * 3] = d[0] * 100;
      pos[i * 3 + 1] = d[1] * 100;
      pos[i * 3 + 2] = d[2] * 100;
      const m = Math.pow(rnd(), 9); // a few very bright stars, many faint ones
      const tint = starTint(rnd());
      const b = 0.25 + 2.6 * m;
      col[i * 3] = tint[0] * b;
      col[i * 3 + 1] = tint[1] * b;
      col[i * 3 + 2] = tint[2] * b;
      size[i] = 0.9 + m * 4.5;
      phase[i] = rnd() * 100;
    }
    return {pos, col, size, phase};
  }, [seed, count, band]);

  const colors = useMemo(() => {
    if (!twinkle) return data.col;
    const c = new Float32Array(data.col.length);
    for (let i = 0; i < count; i++) {
      const tw = 1 - twinkle * (0.5 + 0.5 * Math.sin(frame * 0.21 + data.phase[i]) * Math.sin(frame * 0.077 + data.phase[i] * 1.7));
      c[i * 3] = data.col[i * 3] * tw;
      c[i * 3 + 1] = data.col[i * 3 + 1] * tw;
      c[i * 3 + 2] = data.col[i * 3 + 2] * tw;
    }
    return c;
  }, [data, frame, twinkle, count]);

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const dir: V3 = [sy * cp, sp, -cy * cp];
  const up: V3 = [Math.sin(roll), Math.cos(roll), 0];
  const camera = makeCamera({eye: [0, 0, 0], target: dir, up, fov, near: 0.01, far: 1000}, width, height);

  // Warp: move stars toward the camera along the view direction, wrapping around.
  const {positions, prev} = useMemo(() => {
    if (!warp) return {positions: data.pos, prev: undefined};
    const p = new Float32Array(data.pos.length);
    const q = new Float32Array(data.pos.length);
    const travel = warp * 100;
    for (let i = 0; i < count; i++) {
      const x = data.pos[i * 3];
      const y = data.pos[i * 3 + 1];
      const z = data.pos[i * 3 + 2];
      const along = x * dir[0] + y * dir[1] + z * dir[2];
      // fold the sphere into a tube in front of the camera
      const k = ((along + 100 - (frame * travel) / 100) % 200 + 200) % 200;
      const off = k - 100 + 3;
      p[i * 3] = x + dir[0] * (off - along);
      p[i * 3 + 1] = y + dir[1] * (off - along);
      p[i * 3 + 2] = z + dir[2] * (off - along);
      q[i * 3] = p[i * 3] - dir[0] * travel * 0.9;
      q[i * 3 + 1] = p[i * 3 + 1] - dir[1] * travel * 0.9;
      q[i * 3 + 2] = p[i * 3 + 2] - dir[2] * travel * 0.9;
    }
    return {positions: p, prev: q};
  }, [data, warp, frame, count, dir[0], dir[1], dir[2]]);

  return (
    <ParticleLayer
      camera={camera}
      style={style}
      sets={[
        {
          positions,
          prev,
          colors,
          sizes: data.size,
          sizeMode: 'px',
          sizeMul,
          intensity: brightness,
          minPx: 0.9,
          halo: 0.6,
          streakDim: 0.3,
          nearFade: warp ? [0.5, 8] : undefined,
        },
      ]}
    />
  );
};
