import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ShaderLayer} from '../lib/ShaderLayer';
import {ParticleLayer} from '../lib/ParticleLayer';
import {NOVA_FRAG, STARS_FRAG} from '../shaders/stars';
import {StarField} from '../components/StarField';
import {Line, Title, Label, useLayout} from '../components/Text';
import {Flash, Shake, Vignette} from '../components/Fx';
import {LATIN} from '../fonts';
import {S} from '../script';
import {clamp, easeIn, easeInOut, easeOut, lerp, logLerp, makeCamera, prog, smoothstep} from '../lib/math';
import {mulberry32, onSphere} from '../lib/random';
import {STARS_DUR, NOVA_AT} from '../timing';


const RADII = [1, 1.71, 8.8, 25.4, 78.9, 764, 2150];
const TEMPS = [0.44, 0.9, 0.3, 0.27, 1.0, 0.07, 0.02];
const ARRIVE = [0, 62, 104, 146, 188, 236, 290];
const SATURN = 2060; // Saturn's orbit in solar radii

export const Stars: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width: W, height: H, portrait, S: M} = useLayout();

  // World layout: stars sit on a common baseline, left to right.
  const xs = useMemo(() => {
    const out = [0];
    for (let i = 1; i < RADII.length; i++) out.push(out[i - 1] + RADII[i - 1] + RADII[i] * 1.25);
    return out;
  }, []);

  // Continuous focus index.
  let kf = 0;
  for (let i = 1; i < ARRIVE.length; i++) {
    const e = easeInOut(prog(f, ARRIVE[i] - 34, ARRIVE[i]));
    if (f >= ARRIVE[i] - 34) kf = i - 1 + e;
  }
  const k0 = Math.min(Math.floor(kf), RADII.length - 2);
  const e = kf - k0;
  const fill = (portrait ? 0.62 : 0.4) * W;
  const scaleOf = (i: number) => fill / (2 * RADII[i]);
  const s = logLerp(scaleOf(k0), scaleOf(k0 + 1), e);
  const cxw = lerp(xs[k0], xs[k0 + 1], e);
  const baseY = (portrait ? 0.66 : 0.8) * H;

  // Supernova phase: the final supergiant pulses, implodes, then detonates.
  const pulseAmp = smoothstep(380, 450, f);
  const pulse = 1 + pulseAmp * 0.05 * Math.sin(f * lerp(0.15, 0.6, pulseAmp));
  const collapse = easeIn(prog(f, 448, NOVA_AT));
  const novaT = f - NOVA_AT;

  const stars = RADII.map((R, i) => {
    let r = R * s;
    const x = W / 2 + (xs[i] - cxw) * s;
    let y = baseY - R * s;
    if (i === RADII.length - 1) {
      r *= pulse * (1 - collapse * 0.995);
      y = baseY - R * s;
    }
    return {x, y, r, t: TEMPS[i]};
  });
  const big = stars[stars.length - 1];
  const othersFade = 1 - smoothstep(330, 380, f);

  const uStar: number[] = [];
  const seeds: number[] = [];
  stars.forEach((st, i) => {
    const vis = i === stars.length - 1 ? 1 : othersFade;
    uStar.push(st.x, st.y, vis > 0.01 ? st.r : 0.0001, st.t);
    seeds.push(i * 1.7);
  });
  uStar.push(0, 0, 0, 0);
  seeds.push(0);

  // Debris for the explosion.
  const debris = useMemo(() => {
    const rnd = mulberry32(99);
    const n = 26000;
    const dir = new Float32Array(n * 3);
    const speed = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const d = onSphere(rnd);
      dir.set(d, i * 3);
      speed[i] = 0.4 + Math.pow(rnd(), 0.6) * 1.0;
      const c = rnd();
      const tint = c < 0.4 ? [1, 0.45, 0.18] : c < 0.7 ? [0.35, 0.85, 1] : [1, 0.85, 0.6];
      const b = 0.5 + rnd() * 1.2;
      col.set([tint[0] * b, tint[1] * b, tint[2] * b], i * 3);
      size[i] = 0.004 + rnd() * 0.01;
    }
    return {dir, speed, col, size, n};
  }, []);

  const debrisPos = useMemo(() => {
    if (novaT < 0) return null;
    const {dir, speed, n} = debris;
    const ex = (t: number) => 1 - Math.exp(-Math.max(t, 0) / 22);
    const r0 = ex(novaT) * 1.6 + novaT * 0.002;
    const r1 = ex(novaT - 1.5) * 1.6 + (novaT - 1.5) * 0.002;
    const p = new Float32Array(n * 3);
    const q = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) {
      p[i] = dir[i] * r0 * speed[Math.floor(i / 3)];
      q[i] = dir[i] * Math.max(r1, 0) * speed[Math.floor(i / 3)];
    }
    return {p, q};
  }, [debris, novaT]);
  const cam = makeCamera({eye: [0, 0, 3.2], target: [0, 0, 0], fov: 50}, W, H);
  // keep the explosion centered where the star was
  const novaCenter: [number, number] = [big.x, big.y];

  const novaR = M * (0.05 + 0.55 * easeOut(clamp(novaT / 150)) + 0.0006 * Math.max(novaT - 150, 0));
  const novaAge = clamp(novaT / 200);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake impacts={[{at: NOVA_AT, power: 46, decay: 16}, {at: NOVA_AT - 14, power: 6, decay: 10}]} base={pulseAmp * (1 - collapse) * 2}>
        <StarField seed={44} yaw={2.2 + f * 0.0005} pitch={0.1} brightness={0.7} />
        {novaT < 6 ? (
          <ShaderLayer
            frag={STARS_FRAG}
            time={f / fps}
            uniforms={{
              uStar: {type: '4fv', value: uStar},
              uSeed: {type: '1fv', value: seeds},
              uCount: 8,
              uExposure: 1.0 + collapse * 3,
              uGlowMul: 1 + collapse * 2,
            }}
          />
        ) : null}
        {novaT >= 0 ? (
          <>
            <ShaderLayer
              frag={NOVA_FRAG}
              time={f / fps}
              uniforms={{
                uCenter: novaCenter,
                uRadius: novaR,
                uAge: novaAge,
                uFlash: Math.exp(-novaT / 10),
                uCore: lerp(1.6, 0.45, clamp(novaT / 90)),
                uExposure: 1.1,
              }}
            />
            {debrisPos ? (
              <ParticleLayer
                camera={cam}
                style={{transform: `translate(${novaCenter[0] - W / 2}px, ${novaCenter[1] - H / 2}px)`}}
                sets={[
                  {
                    positions: debrisPos.p,
                    prev: debrisPos.q,
                    colors: debris.col,
                    sizes: debris.size,
                    intensity: 1.6 * Math.exp(-novaT / 120),
                    minPx: 1,
                    streakDim: 0.4,
                  },
                ]}
              />
            ) : null}
          </>
        ) : null}
        {/* orbits overlaid on the largest star */}
        <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: smoothstep(296, 315, f) * (1 - smoothstep(390, 410, f))}}>
          {[
            {r: 215, label: '地球轨道'},
            {r: 1118, label: '木星轨道'},
            {r: SATURN, label: S.stars.saturn},
          ].map((o, i) => {
            const rr = o.r * s * (1 + 0.4 * (1 - easeOut(prog(f, 300 + i * 12, 330 + i * 12))));
            const a = smoothstep(300 + i * 12, 318 + i * 12, f);
            const isSat = i === 2;
            return (
              <g key={i} opacity={a}>
                <circle cx={big.x} cy={big.y} r={rr} fill="none" stroke={isSat ? '#fff3c4' : 'rgba(255,255,255,0.7)'} strokeWidth={isSat ? 3 : 1.5} strokeDasharray={isSat ? '14 8' : '6 6'} />
                <text x={big.x + rr * 0.72} y={big.y - rr * 0.72 - 10} fill={isSat ? '#fff3c4' : '#fff'} fontSize={(isSat ? 0.03 : 0.022) * M} fontFamily="Noto Sans SC" style={{textShadow: '0 0 8px #000'}}>
                  {o.label}
                </text>
              </g>
            );
          })}
        </svg>
      </Shake>
      {/* labels for the comparison */}
      {stars.map((st, i) => {
        const a = clamp(1 - Math.abs(kf - i) * 1.6) * (i === 6 ? 1 - smoothstep(380, 400, f) : 1) * smoothstep(8, 20, f);
        if (a <= 0.01) return null;
        return (
          <div key={i} style={{position: 'absolute', left: st.x, top: baseY + 0.03 * M, transform: 'translateX(-50%)', textAlign: 'center', opacity: a}}>
            <Label size={0.04} weight={500}>
              {S.stars.names[i]}
            </Label>
            <div style={{fontFamily: LATIN, fontWeight: 300, fontSize: 0.03 * M, color: '#ffd9a0', marginTop: 6, whiteSpace: 'nowrap', letterSpacing: '0.05em'}}>
              {S.stars.radiusLabel}
              {S.stars.ratios[i]}
            </div>
          </div>
        );
      })}
      {/* the Sun keeps a pointer once it shrinks to a dot */}
      {(() => {
        const sun = stars[0];
        const a = smoothstep(40, 70, f) * (1 - smoothstep(330, 360, f)) * smoothstep(0.5, 1.5, kf);
        if (a <= 0.01) return null;
        return (
          <div style={{position: 'absolute', left: sun.x, top: baseY - 0.11 * M, transform: 'translateX(-50%)', opacity: a, textAlign: 'center'}}>
            <Label size={0.026} color="#ffe9b8">
              {S.stars.names[0]}
            </Label>
            <div style={{width: 1.5, height: 0.06 * M, margin: '6px auto 0', background: 'linear-gradient(#ffe9b8, rgba(255,233,184,0))'}} />
          </div>
        );
      })()}
      <Vignette strength={0.55} />
      <Sequence from={6} durationInFrames={56}>
        <Title kicker={S.stars.kicker} title={S.stars.title} en={S.stars.en} dur={56} pos="top" size={0.16} />
      </Sequence>
      <Sequence from={300} durationInFrames={92}>
        <Line text={S.stars.f1} dur={92} pos={portrait ? 0.8 : 'lower'} size={0.044} />
        <Line text={S.stars.f2} dur={92} pos={portrait ? 0.86 : 'bottom'} size={0.05} delay={16} />
      </Sequence>
      <Sequence from={396} durationInFrames={58}>
        <Line text={S.stars.f3} dur={58} pos={portrait ? 0.85 : 'bottom'} size={0.042} font="serif" weight={500} />
      </Sequence>
      <Sequence from={NOVA_AT + 8} durationInFrames={95}>
        <Title title={S.stars.nova} en={S.stars.novaEn} dur={95} pos={portrait ? 'top' : 'upper'} size={0.15} />
      </Sequence>
      <Sequence from={NOVA_AT + 95} durationInFrames={56}>
        <Line text={S.stars.f4} dur={56} pos={portrait ? 0.84 : 'bottom'} size={0.046} />
      </Sequence>
      <Sequence from={NOVA_AT + 148} durationInFrames={STARS_DUR - NOVA_AT - 148}>
        <Line text={S.stars.f5} dur={STARS_DUR - NOVA_AT - 148} pos={portrait ? 0.84 : 'bottom'} size={0.044} />
      </Sequence>
      <Flash at={NOVA_AT} rise={2} decay={22} />
      <AbsoluteFill style={{background: '#000', opacity: clamp((f - (STARS_DUR - 14)) / 14)}} />
    </AbsoluteFill>
  );
};
