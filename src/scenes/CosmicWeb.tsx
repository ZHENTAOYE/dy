import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {ParticleLayer} from '../lib/ParticleLayer';
import {Line, Title, Mono, useLayout} from '../components/Text';
import {Shake, Vignette} from '../components/Fx';
import {S} from '../script';
import {easeIn, easeInOut, easeOut, lerp, logLerp, makeCamera, mix3, orbit, prog, smoothstep, sub, V3} from '../lib/math';
import {gauss, mulberry32, onSphere} from '../lib/random';
import {WEB_DUR, COLLAPSE_START} from '../timing';

const L = 100;

type Web = {n: number; pos: Float32Array; col: Float32Array; size: Float32Array; glowN: number};

const buildWeb = (): Web => {
  const rnd = mulberry32(2024);
  const nodes: V3[] = [];
  // a spherical patch of universe, so the collapse converges to a round point
  const inBall = (r: number): V3 => {
    const d = onSphere(rnd);
    const k = Math.cbrt(rnd()) * r;
    return [d[0] * k, d[1] * k, d[2] * k];
  };
  for (let i = 0; i < 120; i++) nodes.push(inBall(L));
  nodes[0] = [0, 0, 0]; // our Local Group sits at the origin
  const edges = new Set<string>();
  const degree = new Array(nodes.length).fill(0);
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({j, d: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])}))
      .filter((x) => x.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 3);
    near.forEach(({j}) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edges.has(key)) {
        edges.add(key);
        degree[i]++;
        degree[j]++;
      }
    });
  });
  const pts: number[] = [];
  const cols: number[] = [];
  const sizes: number[] = [];
  const push = (p: V3, c: V3, s: number) => {
    pts.push(p[0], p[1], p[2]);
    cols.push(c[0], c[1], c[2]);
    sizes.push(s);
  };
  const galaxyColor = (b: number, warm: number): V3 => {
    const t = rnd();
    const base: V3 = t < 0.55 ? [1, 0.78, 0.52] : t < 0.85 ? [0.95, 0.92, 1] : [0.6, 0.72, 1];
    return [base[0] * b * (1 + warm * 0.1), base[1] * b, base[2] * b * (1 - warm * 0.1)];
  };
  // filaments
  edges.forEach((key) => {
    const [i, j] = key.split('-').map(Number);
    const a = nodes[i];
    const b = nodes[j];
    const d = sub(b, a);
    const len = Math.hypot(...d);
    const n = Math.floor(len * 16);
    const bend = onSphere(rnd);
    const amp = len * 0.08 * (rnd() - 0.5);
    for (let k = 0; k < n; k++) {
      const u = rnd();
      const sw = Math.sin(Math.PI * u);
      const thick = 0.5 + 0.9 * sw;
      const p: V3 = [
        a[0] + d[0] * u + bend[0] * amp * sw + gauss(rnd) * thick,
        a[1] + d[1] * u + bend[1] * amp * sw + gauss(rnd) * thick,
        a[2] + d[2] * u + bend[2] * amp * sw + gauss(rnd) * thick,
      ];
      push(p, galaxyColor(0.22 + rnd() * 0.45, 1), 0.1 + rnd() * 0.18);
    }
  });
  // clusters at the nodes
  nodes.forEach((c, i) => {
    const n = 250 + degree[i] * 220;
    for (let k = 0; k < n; k++) {
      const r = Math.abs(gauss(rnd)) * (1 + degree[i] * 0.4) * Math.pow(rnd(), 0.6);
      const dir = onSphere(rnd);
      push([c[0] + dir[0] * r, c[1] + dir[1] * r, c[2] + dir[2] * r], galaxyColor(0.3 + rnd() * 0.7, 0), 0.12 + rnd() * 0.2);
    }
  });
  // sparse field galaxies in the voids
  for (let k = 0; k < 14000; k++) {
    push(inBall(L * 1.1), [0.25, 0.25, 0.4].map((x) => x * (0.3 + rnd() * 0.5)) as V3, 0.12);
  }
  const n = sizes.length;
  // soft violet haze tracing the dark-matter scaffolding (subset of filament points, big and faint)
  const glowN = Math.floor(n / 8);
  for (let k = 0; k < glowN; k++) {
    const src = Math.floor(rnd() * (n - 14000));
    push([pts[src * 3], pts[src * 3 + 1], pts[src * 3 + 2]], [0.3, 0.2, 0.62], 2 + rnd() * 2);
  }
  return {n, pos: new Float32Array(pts), col: new Float32Array(cols), size: new Float32Array(sizes), glowN};
};

export const CosmicWeb: React.FC = () => {
  const f = useCurrentFrame();
  const {width: W, height: H, portrait, S: M} = useLayout();
  const web = useMemo(buildWeb, []);

  const center: V3 = [6, 4, -30];
  // Collapse factor: 1 = today, 0 = everything in one point.
  const sOf = (fr: number) => {
    const p = prog(fr, COLLAPSE_START, WEB_DUR - 8);
    return Math.max(1 - easeIn(p) * 1.0, 0.0005) ** 1.3;
  };
  const camAt = (fr: number) => {
    const out = easeOut(prog(fr, 0, 210));
    const fly = easeInOut(prog(fr, 190, COLLAPSE_START));
    const back = easeInOut(prog(fr, COLLAPSE_START - 30, WEB_DUR - 40));
    // 1) pull out of the Local Group; 2) glide through filaments; 3) back off to watch the collapse
    const d = logLerp(0.6, 230, out);
    let eye: V3 = orbit([0, 0, 0], d, 20 + fr * 0.12, 18);
    let target: V3 = [0, 0, 0];
    const flyFrom: V3 = orbit([0, 0, 0], 230, 20 + 190 * 0.12, 18);
    const flyTo: V3 = [40, 10, 60];
    if (fr > 190) {
      eye = mix3(flyFrom, flyTo, fly);
      target = mix3([0, 0, 0], center, fly);
    }
    if (fr > COLLAPSE_START - 30) {
      eye = mix3(eye, [center[0] + 30, center[1] + 20, center[2] + 160], back);
      target = mix3(target, center, back);
    }
    return makeCamera({eye, target, fov: 60, near: 0.01, far: 5000}, W, H);
  };
  const cam = camAt(f);
  const prevCam = camAt(f - 1.5);

  const s = sOf(f);
  const sPrev = sOf(f - 2);
  const collapsing = f >= COLLAPSE_START;
  const swirl = (x: number) => (1 - x) * 2.2;

  const {positions, prev} = useMemo(() => {
    if (!collapsing) return {positions: web.pos, prev: undefined};
    const total = web.pos.length / 3;
    const p = new Float32Array(web.pos.length);
    const q = new Float32Array(web.pos.length);
    const a0 = swirl(s);
    const a1 = swirl(sPrev);
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    for (let i = 0; i < total; i++) {
      const x = web.pos[i * 3] - center[0];
      const y = web.pos[i * 3 + 1] - center[1];
      const z = web.pos[i * 3 + 2] - center[2];
      p[i * 3] = center[0] + (c0 * x - s0 * z) * s;
      p[i * 3 + 1] = center[1] + y * s;
      p[i * 3 + 2] = center[2] + (s0 * x + c0 * z) * s;
      q[i * 3] = center[0] + (c1 * x - s1 * z) * sPrev;
      q[i * 3 + 1] = center[1] + y * sPrev;
      q[i * 3 + 2] = center[2] + (s1 * x + c1 * z) * sPrev;
    }
    return {positions: p, prev: q};
  }, [web, collapsing, s, sPrev]);

  // During the collapse the light heats up toward blue-white.
  const heat = smoothstep(COLLAPSE_START + 40, WEB_DUR - 10, f);
  const colors = useMemo(() => {
    if (heat <= 0) return web.col;
    const c = new Float32Array(web.col.length);
    for (let i = 0; i < c.length; i += 3) {
      c[i] = lerp(web.col[i], 0.8, heat * 0.6);
      c[i + 1] = lerp(web.col[i + 1], 0.9, heat * 0.6);
      c[i + 2] = lerp(web.col[i + 2], 1.3, heat * 0.6);
    }
    return c;
  }, [web, heat]);

  const reveal = smoothstep(0, 30, f);
  const n = web.n;
  const total = web.pos.length / 3;
  const point = cam.project(center);
  const ago = collapsing ? 138 * easeIn(prog(f, COLLAPSE_START + 10, WEB_DUR - 8)) : 0;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake impacts={[]} base={heat * 9}>
        <ParticleLayer
          camera={cam}
          prevCamera={collapsing ? cam : prevCam}
          hdr={lerp(0.75, 1.2, heat)}
          sets={[
            {
              positions: positions.subarray(n * 3),
              prev: prev ? prev.subarray(n * 3) : undefined,
              colors: colors.subarray(n * 3),
              sizes: web.size.subarray(n),
              count: total - n,
              minPx: 3,
              maxPx: 160,
              intensity: 0.022 * reveal * (1 - heat),
              nearFade: [4, 20],
              streakDim: 0.9,
            },
            {
              positions: positions.subarray(0, n * 3),
              prev: prev ? prev.subarray(0, n * 3) : undefined,
              colors: colors.subarray(0, n * 3),
              sizes: web.size.subarray(0, n),
              count: n,
              minPx: 0.75,
              maxPx: 7,
              intensity: (1 + heat * 0.25) * reveal,
              nearFade: [0.3, 2.5],
              streakDim: 0.55,
            },
          ]}
        />
        {/* the collapsing point becomes blinding */}
        {collapsing ? (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            <defs>
              <radialGradient id="singular">
                <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="0.2" stopColor="#cfe0ff" stopOpacity="0.6" />
                <stop offset="1" stopColor="#6f8cff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={point.x} cy={point.y} r={M * (0.04 + 0.3 * heat) * (1 - 0.85 * smoothstep(WEB_DUR - 14, WEB_DUR, f))} fill="url(#singular)" opacity={heat} style={{mixBlendMode: 'screen'}} />
          </svg>
        ) : null}
      </Shake>
      {collapsing ? (
        <div style={{position: 'absolute', width: W, top: (portrait ? 0.7 : 0.78) * H, textAlign: 'center', opacity: smoothstep(COLLAPSE_START + 10, COLLAPSE_START + 30, f) * (1 - smoothstep(WEB_DUR - 12, WEB_DUR - 2, f))}}>
          <Mono size={0.05} color="#cfe0ff">
            {`T − ${ago.toFixed(1)} 亿年`}
          </Mono>
        </div>
      ) : null}
      <Vignette strength={0.6} />
      <Sequence from={30} durationInFrames={120}>
        <Title kicker={S.web.kicker} title={S.web.title} en={S.web.en} dur={120} pos={portrait ? 'top' : 'upper'} size={0.17} />
      </Sequence>
      <Sequence from={160} durationInFrames={90}>
        <Line text={S.web.f1} dur={90} pos={portrait ? 0.84 : 'bottom'} size={0.046} />
      </Sequence>
      <Sequence from={255} durationInFrames={90}>
        <Line text={S.web.f2} dur={90} pos={portrait ? 0.84 : 'bottom'} size={0.046} />
      </Sequence>
      <Sequence from={350} durationInFrames={85}>
        <Line text={S.web.f3} dur={85} pos={portrait ? 0.84 : 'bottom'} size={0.05} />
      </Sequence>
      <Sequence from={COLLAPSE_START - 20} durationInFrames={90}>
        <Line text={S.web.f4} dur={90} pos={portrait ? 'top' : 'upper'} size={0.056} font="serif" weight={700} />
      </Sequence>
    </AbsoluteFill>
  );
};
