import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {ShaderLayer} from '../lib/ShaderLayer';
import {ParticleLayer} from '../lib/ParticleLayer';
import {BANG_FRAG} from '../shaders/bang';
import {WarpField} from '../components/WarpField';
import {Line, Title, useLayout} from '../components/Text';
import {Flash, Shake, Vignette} from '../components/Fx';
import {S} from '../script';
import {clamp, easeIn, lerp, makeCamera, noise1, prog, smoothstep} from '../lib/math';
import {mulberry32, onSphere} from '../lib/random';
import {BANG_DUR, BANG_AT, STARS_ON, WARP_START} from '../timing';


// Distance flown by the warp camera; shared with the finale so the jump is continuous.
export const warpTravel = (f: number) => {
  const t = Math.max(0, f - WARP_START);
  return t * t * 0.018 + t * 0.05;
};
export const warpSpeed = (f: number) => warpTravel(f) - warpTravel(f - 1);

export const BigBang: React.FC = () => {
  const f = useCurrentFrame();
  const {width: W, height: H, portrait, S: M} = useLayout();
  const tb = (f - BANG_AT) / 30;

  const debris = useMemo(() => {
    const rnd = mulberry32(1234);
    const n = 60000;
    const dir = new Float32Array(n * 3);
    const v = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      dir.set(onSphere(rnd), i * 3);
      v[i] = 0.3 + Math.pow(rnd(), 0.5);
      const c = rnd();
      const tint = c < 0.35 ? [1, 0.9, 0.75] : c < 0.6 ? [1, 0.55, 0.25] : c < 0.85 ? [0.6, 0.75, 1] : [0.9, 0.4, 1];
      const b = 0.4 + rnd() * 1.4;
      col.set([tint[0] * b, tint[1] * b, tint[2] * b], i * 3);
      size[i] = 0.01 + rnd() * 0.03;
    }
    return {dir, v, col, size, n};
  }, []);
  const dpos = useMemo(() => {
    if (tb < 0 || tb > 9) return null;
    const g = (t: number) => 9 * (1 - Math.exp(-Math.max(t, 0) / 0.9)) + Math.max(t, 0) * 0.6;
    const r0 = g(tb);
    const r1 = g(tb - 0.06);
    const p = new Float32Array(debris.n * 3);
    const q = new Float32Array(debris.n * 3);
    for (let i = 0; i < debris.n; i++) {
      for (let k = 0; k < 3; k++) {
        p[i * 3 + k] = debris.dir[i * 3 + k] * debris.v[i] * r0;
        q[i * 3 + k] = debris.dir[i * 3 + k] * debris.v[i] * r1;
      }
    }
    return {p, q};
  }, [debris, tb]);
  const cam = makeCamera({eye: [0, 0, 5], target: [0, 0, 0], fov: 60, near: 0.01, far: 100}, W, H);

  // The singularity trembles before it goes.
  const pre = smoothstep(0, BANG_AT, f);
  const jitter = f < BANG_AT ? pre * pre * 6 : 0;
  const px = W / 2 + noise1(f * 1.7) * jitter;
  const py = H / 2 + noise1(f * 1.7 + 9) * jitter;
  const pointR = M * (0.012 + 0.03 * pre * pre) * (1 + 0.25 * Math.sin(f * 0.9) * pre);

  const fire = f >= BANG_AT ? 1 - smoothstep(300, 345, f) : 0;
  const cmb = smoothstep(290, 345, f) * (1 - smoothstep(432, 462, f));
  const travel = warpTravel(f);
  const speed = warpSpeed(f);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake
        impacts={[
          {at: BANG_AT, power: 70, decay: 22},
          {at: BANG_AT + 18, power: 20, decay: 30},
        ]}
        base={f < BANG_AT ? pre * pre * 4 : f > WARP_START ? clamp(speed * 1.2, 0, 10) : 0}
      >
        {f < BANG_AT ? (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            <defs>
              <radialGradient id="pt">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.25" stopColor="#dfe8ff" stopOpacity="0.8" />
                <stop offset="1" stopColor="#7f9cff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={px} cy={py} r={pointR * 3} fill="url(#pt)" />
            <circle cx={px} cy={py} r={pointR * 0.35} fill="#fff" />
          </svg>
        ) : null}
        {f >= BANG_AT && f < 470 ? (
          <ShaderLayer
            frag={BANG_FRAG}
            resolution={0.6}
            uniforms={{uT: Math.max(tb, 0), uFlash: 0, uCMB: cmb, uFire: fire, uExposure: 1.0, uCenter: [W / 2, H / 2]}}
          />
        ) : null}
        {dpos ? (
          <ParticleLayer
            camera={cam}
            hdr={1}
            sets={[{positions: dpos.p, prev: dpos.q, colors: debris.col, sizes: debris.size, intensity: 2.2 * Math.exp(-tb / 3), minPx: 1, maxPx: 8, streakDim: 0.5, nearFade: [0.2, 1.5]}]}
          />
        ) : null}
        {f >= STARS_ON - 10 ? (
          <WarpField travel={travel} speed={speed} seed={77} count={7000} hue="blue" ignite={{from: STARS_ON, to: 560}} brightness={1.1} hdr={1.1} />
        ) : null}
      </Shake>
      <Vignette strength={0.55} />
      <Sequence from={6} durationInFrames={BANG_AT - 8}>
        <Line text={S.bang.f0} dur={BANG_AT - 8} pos={portrait ? 'upper' : 'upper'} size={0.07} font="serif" weight={700} />
      </Sequence>
      <Sequence from={26} durationInFrames={BANG_AT - 28}>
        <Line text={S.bang.f1} dur={BANG_AT - 28} pos={portrait ? 0.72 : 'lower'} size={portrait ? 0.038 : 0.036} fadeOut={6} />
      </Sequence>
      <Sequence from={BANG_AT + 12} durationInFrames={110}>
        <Title title={S.bang.title} en={S.bang.en} dur={110} pos={portrait ? 'top' : 'upper'} size={0.2} />
      </Sequence>
      <Sequence from={210} durationInFrames={88}>
        <Line text={S.bang.f2} dur={88} pos={portrait ? 0.84 : 'bottom'} size={portrait ? 0.04 : 0.04} />
      </Sequence>
      <Sequence from={318} durationInFrames={76}>
        <Line text={S.bang.f3} dur={76} pos={portrait ? 0.84 : 'bottom'} size={0.046} />
      </Sequence>
      <Sequence from={384} durationInFrames={66}>
        <Line text={S.bang.cmb} dur={66} pos={portrait ? 'top' : 'top'} size={0.044} font="serif" weight={700} />
      </Sequence>
      <Sequence from={478} durationInFrames={90}>
        <Line text={S.bang.f4} dur={90} pos={portrait ? 0.84 : 'bottom'} size={0.044} />
      </Sequence>
      <Flash at={BANG_AT} rise={2} decay={34} />
      <AbsoluteFill style={{background: '#fff', opacity: easeIn(prog(f, BANG_DUR - 10, BANG_DUR)) * 0.85}} />
      <AbsoluteFill style={{background: '#000', opacity: lerp(0, 0, 0)}} />
    </AbsoluteFill>
  );
};
