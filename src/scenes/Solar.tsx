import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {ParticleLayer} from '../lib/ParticleLayer';
import {StarField} from '../components/StarField';
import {Line, Title, Label, Mono, useLayout} from '../components/Text';
import {Vignette} from '../components/Fx';
import {S} from '../script';
import {clamp, easeInOut, lerp, logLerp, makeCamera, orbit, prog, smoothstep, V3} from '../lib/math';
import {gauss, mulberry32, onSphere} from '../lib/random';
import {SOLAR_DUR} from '../timing';


const PLANETS = [
  {a: 0.387, P: 0.241, c: [0.75, 0.7, 0.65], px: 3.2, ph: 0.3},
  {a: 0.723, P: 0.615, c: [1, 0.85, 0.55], px: 4.2, ph: 2.1},
  {a: 1.0, P: 1.0, c: [0.4, 0.65, 1], px: 4.5, ph: 4.0},
  {a: 1.524, P: 1.881, c: [1, 0.45, 0.25], px: 3.6, ph: 1.0},
  {a: 5.2, P: 11.86, c: [0.98, 0.82, 0.62], px: 8.5, ph: 3.3},
  {a: 9.58, P: 29.46, c: [0.98, 0.88, 0.62], px: 7.5, ph: 5.2},
  {a: 19.2, P: 84.0, c: [0.62, 0.92, 0.98], px: 5.5, ph: 0.6},
  {a: 30.05, P: 164.8, c: [0.4, 0.55, 1], px: 5.5, ph: 2.6},
] as const;

// Elapsed simulated years: the clock accelerates as the camera pulls back.
const years = (f: number) => f / 75 + Math.pow(Math.max(0, f - 120) / 60, 2.2);

export const Solar: React.FC = () => {
  const f = useCurrentFrame();
  const {width: W, height: H, portrait, S: M} = useLayout();

  const belts = useMemo(() => {
    const rnd = mulberry32(7);
    const nA = 7000;
    const nK = 14000;
    const nO = 60000;
    const ast = {a: new Float32Array(nA), th: new Float32Array(nA), z: new Float32Array(nA), col: new Float32Array(nA * 3), size: new Float32Array(nA)};
    for (let i = 0; i < nA; i++) {
      ast.a[i] = 2.2 + Math.pow(rnd(), 0.8) * 1.1 + gauss(rnd) * 0.05;
      ast.th[i] = rnd() * Math.PI * 2;
      ast.z[i] = gauss(rnd) * 0.08;
      const b = 0.25 + rnd() * 0.35;
      ast.col.set([b * 1.0, b * 0.85, b * 0.7], i * 3);
      ast.size[i] = 1 + rnd() * 0.8;
    }
    const kui = {pos: new Float32Array(nK * 3), col: new Float32Array(nK * 3), size: new Float32Array(nK), a: new Float32Array(nK), th: new Float32Array(nK)};
    for (let i = 0; i < nK; i++) {
      const a = 30 + Math.abs(gauss(rnd)) * 9 + rnd() * 8;
      kui.a[i] = a;
      kui.th[i] = rnd() * Math.PI * 2;
      kui.pos[i * 3 + 1] = gauss(rnd) * 3;
      const b = 0.22 + rnd() * 0.3;
      kui.col.set([b * 0.75, b * 0.85, b * 1.0], i * 3);
      kui.size[i] = 1 + rnd() * 0.6;
    }
    const oort = {pos: new Float32Array(nO * 3), col: new Float32Array(nO * 3), size: new Float32Array(nO)};
    for (let i = 0; i < nO; i++) {
      const r = Math.exp(lerp(Math.log(2000), Math.log(100000), Math.pow(rnd(), 0.45)));
      const d = onSphere(rnd);
      // the inner Oort cloud is flattened toward the ecliptic
      const flat = r < 15000 ? 0.45 : 1;
      oort.pos.set([d[0] * r, d[1] * r * flat, d[2] * r], i * 3);
      const b = 0.12 + rnd() * 0.25;
      oort.col.set([b * 0.8, b * 0.9, b * 1.0], i * 3);
      oort.size[i] = 1 + rnd() * 1.1;
    }
    return {ast, kui, oort, nA, nK};
  }, []);

  const T = years(f);
  const Tprev = years(f - 1.5);

  // Camera: from the inner planets out past the Oort cloud.
  const pull1 = easeInOut(prog(f, 40, 250));
  const pull2 = easeInOut(prog(f, 270, 450));
  const dist = logLerp(logLerp(4.2, 112, pull1), 300000, pull2);
  const cam = makeCamera(
    {eye: orbit([0, 0, 0], dist, -20 + f * 0.1, lerp(13, 24, pull1) + 22 * pull2), target: [0, 0, 0], fov: 45, near: dist * 0.001, far: dist * 10},
    W,
    H,
  );

  const pos = (a: number, P: number, ph: number, t: number): V3 => {
    const th = ph + (t / P) * Math.PI * 2;
    return [Math.cos(th) * a, 0, -Math.sin(th) * a];
  };

  const sets = useMemo(() => {
    const {ast, kui, oort, nA, nK} = belts;
    const ap = new Float32Array(nA * 3);
    const aq = new Float32Array(nA * 3);
    for (let i = 0; i < nA; i++) {
      const P = Math.pow(ast.a[i], 1.5);
      const t0 = ast.th[i] + (T / P) * Math.PI * 2;
      const t1 = ast.th[i] + (Tprev / P) * Math.PI * 2;
      ap.set([Math.cos(t0) * ast.a[i], ast.z[i], -Math.sin(t0) * ast.a[i]], i * 3);
      aq.set([Math.cos(t1) * ast.a[i], ast.z[i], -Math.sin(t1) * ast.a[i]], i * 3);
    }
    const kp = new Float32Array(nK * 3);
    for (let i = 0; i < nK; i++) {
      const P = Math.pow(kui.a[i], 1.5);
      const t0 = kui.th[i] + (T / P) * Math.PI * 2;
      kp.set([Math.cos(t0) * kui.a[i], kui.pos[i * 3 + 1], -Math.sin(t0) * kui.a[i]], i * 3);
    }
    const pp = new Float32Array(9 * 3);
    const pq = new Float32Array(9 * 3);
    const pc = new Float32Array(9 * 3);
    const ps = new Float32Array(9);
    PLANETS.forEach((p, i) => {
      pp.set(pos(p.a, p.P, p.ph, T), i * 3);
      pq.set(pos(p.a, p.P, p.ph, Tprev), i * 3);
      pc.set(p.c.map((x) => x * 1.6), i * 3);
      ps[i] = p.px;
    });
    pc.set([3, 2.6, 1.9], 24);
    ps[8] = 9;
    return {ap, aq, kp, pp, pq, pc, ps, oort, ast, kui};
  }, [belts, T, Tprev]);

  const oortVis = smoothstep(285, 380, f);
  const kuiVis = smoothstep(90, 200, f) * (1 - 0.6 * pull2);
  const sun = cam.project([0, 0, 0]);
  const sunGlow = clamp(0.32 / Math.pow(dist / 4.2, 0.3), 0.05, 1);

  // Orbits and trails in SVG for crisp lines.
  const orbitPaths = PLANETS.map((p, i) => {
    // Path with breaks wherever the orbit passes behind the camera.
    let d = '';
    let pen = false;
    for (let k = 0; k <= 160; k++) {
      const th = (k / 160) * Math.PI * 2;
      const q = cam.project([Math.cos(th) * p.a, 0, -Math.sin(th) * p.a]);
      if (q.depth < dist * 0.05) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      pen = true;
    }
    const sep = Math.hypot(cam.project([p.a, 0, 0]).x - sun.x, cam.project([p.a, 0, 0]).y - sun.y);
    const vis = smoothstep(14, 60, sep) * (1 - 0.0 * i);
    const trail: string[] = [];
    const th0 = p.ph + (T / p.P) * Math.PI * 2;
    for (let k = 0; k <= 30; k++) {
      const th = th0 - (k / 30) * Math.min(1.6, Math.max(0.25, ((T - years(f - 20)) / p.P) * Math.PI * 2));
      const q = cam.project([Math.cos(th) * p.a, 0, -Math.sin(th) * p.a]);
      trail.push(`${q.x.toFixed(1)},${q.y.toFixed(1)}`);
    }
    const head = cam.project(pos(p.a, p.P, p.ph, T));
    return {d, trail, vis, head, i};
  });

  const voyager = cam.project([60, 98, -110]); // ~165 AU, high above the ecliptic
  const voyVis = smoothstep(300, 330, f) * (1 - smoothstep(420, 450, f));

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <StarField seed={33} yaw={0.4 + f * 0.0012} pitch={-0.1} brightness={0.85} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="sunglow">
            <stop offset="0" stopColor="#fff8e8" stopOpacity="1" />
            <stop offset="0.05" stopColor="#ffeec0" stopOpacity="0.95" />
            <stop offset="0.18" stopColor="#ffb04a" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#ff7a2a" stopOpacity="0.1" />
            <stop offset="1" stopColor="#ff6a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={sun.x} cy={sun.y} r={M * 0.5 * sunGlow} fill="url(#sunglow)" opacity={0.9} style={{mixBlendMode: 'screen'}} />
        {orbitPaths.map((o) => (
          <g key={o.i} opacity={o.vis * (1 - pull2)}>
            <path d={o.d} fill="none" stroke="rgba(150,185,255,0.28)" strokeWidth={1.4} />
            {o.trail.slice(0, -1).map((pt, k) => (
              <line
                key={k}
                x1={Number(pt.split(',')[0])}
                y1={Number(pt.split(',')[1])}
                x2={Number(o.trail[k + 1].split(',')[0])}
                y2={Number(o.trail[k + 1].split(',')[1])}
                stroke={`rgba(${PLANETS[o.i].c.map((x) => Math.round(x * 255)).join(',')},${0.85 * (1 - k / 30)})`}
                strokeWidth={2.4 * (1 - k / 34)}
                strokeLinecap="round"
              />
            ))}
          </g>
        ))}
        {/* Saturn's rings */}
        {(() => {
          const o = orbitPaths[5];
          return (
            <ellipse cx={o.head.x} cy={o.head.y} rx={16} ry={5} fill="none" stroke="rgba(240,220,170,0.8)" strokeWidth={2} opacity={o.vis * (1 - pull2)} transform={`rotate(-12 ${o.head.x} ${o.head.y})`} />
          );
        })()}
      </svg>
      <ParticleLayer
        camera={cam}
        sets={[
          {positions: sets.ap, colors: sets.ast.col, sizes: sets.ast.size, sizeMode: 'px', intensity: (1 - pull2) * lerp(1.3, 0.45, pull1), minPx: 0.8, nearFade: [0.4, 1.6]},
          {positions: sets.kp, colors: sets.kui.col, sizes: sets.kui.size, sizeMode: 'px', intensity: kuiVis * 1.3, minPx: 0.8},
          {positions: sets.oort.pos, colors: sets.oort.col, sizes: sets.oort.size, sizeMode: 'px', intensity: oortVis * 2.4, minPx: 0.8, halo: 0.5},
          {positions: sets.pp, prev: sets.pq, colors: sets.pc, sizes: sets.ps, sizeMode: 'px', intensity: 1 - pull2 * 0.7, halo: 1, streakDim: 0},
        ]}
      />
      {/* planet labels */}
      {orbitPaths.map((o) => (
        <div key={o.i} style={{position: 'absolute', left: o.head.x + 12, top: o.head.y - 34, opacity: o.vis * (1 - smoothstep(0.05, 0.3, pull2)) * smoothstep(20, 45, f)}}>
          <Label size={0.024} color="rgba(235,240,255,0.92)">
            {S.solar.planets[o.i]}
          </Label>
        </div>
      ))}
      {/* Voyager marker */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: voyVis}}>
        <circle cx={voyager.x} cy={voyager.y} r={4} fill="#9fffd0" />
        <circle cx={voyager.x} cy={voyager.y} r={14} fill="none" stroke="#9fffd0" strokeWidth={1.5} strokeDasharray="4 4" />
        <line x1={voyager.x + 10} y1={voyager.y - 10} x2={voyager.x + 60} y2={voyager.y - 60} stroke="#9fffd0" strokeWidth={1.5} />
      </svg>
      <div style={{position: 'absolute', left: voyager.x + 64, top: voyager.y - 84, opacity: voyVis}}>
        <Mono size={0.024} color="#9fffd0">
          VOYAGER 1
        </Mono>
      </div>
      {/* scale readout */}
      <div style={{position: 'absolute', left: 0, width: W, top: portrait ? 0.78 * H : 0.9 * H, textAlign: 'center', opacity: smoothstep(60, 90, f) * (1 - smoothstep(SOLAR_DUR - 30, SOLAR_DUR - 10, f))}}>
        <Mono size={0.026} color="rgba(200,220,255,0.75)">
          {`视野宽度 ≈ ${Math.round(dist * 0.83).toLocaleString('en-US')} AU`}
        </Mono>
      </div>
      <Vignette strength={0.6} />
      <Sequence from={14} durationInFrames={115}>
        <Title kicker={S.solar.kicker} title={S.solar.title} en={S.solar.en} dur={115} pos={portrait ? 'top' : 'upper'} />
      </Sequence>
      <Sequence from={40} durationInFrames={95}>
        <Line text={S.sun.f3} dur={95} pos={portrait ? 0.86 : 'bottom'} size={0.044} />
      </Sequence>
      <Sequence from={140} durationInFrames={70}>
        <Line text={S.solar.f1} dur={70} pos={portrait ? 0.86 : 'bottom'} />
      </Sequence>
      <Sequence from={212} durationInFrames={78}>
        <Line text={S.solar.f2} dur={78} pos={portrait ? 0.86 : 'bottom'} size={0.046} />
      </Sequence>
      <Sequence from={300} durationInFrames={80}>
        <Line text={S.solar.oort} dur={80} pos={portrait ? 'top' : 'top'} font="serif" weight={700} size={0.052} />
      </Sequence>
      <Sequence from={382} durationInFrames={98}>
        <Line text={S.solar.f3} dur={98} pos={portrait ? 0.84 : 0.8} size={0.04} />
        <Line text={S.solar.f4} dur={98} pos={portrait ? 0.885 : 0.87} size={0.044} delay={14} />
      </Sequence>
      <AbsoluteFill style={{background: '#000', opacity: clamp((f - (SOLAR_DUR - 16)) / 16)}} />
    </AbsoluteFill>
  );
};
