import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {ParticleLayer, ParticleSet} from '../lib/ParticleLayer';
import {makeGalaxy, placeCloud, placePoint, Placement} from '../lib/galaxy';
import {StarField} from '../components/StarField';
import {Line, Title, Label, Mono, useLayout} from '../components/Text';
import {Vignette} from '../components/Fx';
import {S} from '../script';
import {clamp, cross, easeInOut, easeOut, lerp, logLerp, makeCamera, mix3, norm, orbit, prog, smoothstep, sub, V3} from '../lib/math';

const R = 50; // 1 unit = 1000 light years
const MW: Placement = {center: [0, 0, 0], tiltX: 0, tiltZ: 0, spin: 0};
const M31: Placement = {center: [620, 160, -700], tiltX: 1.05, tiltZ: 0.55, spin: 1};

export const MilkyWay: React.FC = () => {
  const f = useCurrentFrame();
  const {width: W, height: H, portrait, S: M} = useLayout();

  const mw = useMemo(() => makeGalaxy({seed: 5, radius: R, stars: 170000, dust: 50000, hii: 2400, arms: 4, pitchDeg: 13, armFrac: 0.58}), []);
  // A sparse copy with huge soft sprites: the diffuse light that particles alone can't give.
  const glow = useMemo(() => {
    const n = Math.floor(mw.stars.n / 6);
    const c = {...mw.stars, n, col: new Float32Array(n * 3), size: new Float32Array(n)};
    for (let i = 0; i < n; i++) {
      c.col.set([mw.stars.col[i * 18], mw.stars.col[i * 18 + 1], mw.stars.col[i * 18 + 2]], i * 3);
      c.size[i] = mw.stars.size[i * 6] * 10;
    }
    return c;
  }, [mw]);
  const m31 = useMemo(() => makeGalaxy({seed: 9, radius: 95, stars: 60000, dust: 12000, hii: 1200, arms: 2, pitchDeg: 9, armFrac: 0.5, bulgeFrac: 0.22, tone: -0.4}), []);

  const camAt = (fr: number) => {
    const out = easeOut(prog(fr, 0, 70));
    const reveal = easeInOut(prog(fr, 40, 320));
    const far = easeInOut(prog(fr, 425, 565));
    let dist = logLerp(4, 12, out);
    dist = logLerp(dist, 125, reveal);
    const pitch = lerp(6, 58, reveal);
    const yaw = lerp(-30, 60, reveal) + fr * 0.03;
    const near: V3 = orbit([0, 0, 0], dist, yaw, pitch);
    // Final framing: look across the MW→M31 axis so the pair stacks vertically in portrait.
    const axis = norm(sub(M31.center, MW.center));
    const side = norm(cross(axis, [0.3, 1, 0.2]));
    const mid = mix3(MW.center, M31.center, 0.5);
    const farEye: V3 = [mid[0] + side[0] * 1700, mid[1] + side[1] * 1700, mid[2] + side[2] * 1700];
    const target: V3 = mix3([0, 0, 0], mix3(MW.center, M31.center, 0.4), far);
    const eyeDir = norm(mix3(norm(sub(near, [0, 0, 0])), norm(sub(farEye, mid)), far));
    const d = logLerp(dist, 1700, far);
    const eye: V3 = [target[0] + eyeDir[0] * d, target[1] + eyeDir[1] * d, target[2] + eyeDir[2] * d];
    const finalUp: V3 = portrait ? axis : norm(cross(side, axis));
    const up = norm(mix3([0, 1, 0], finalUp, far));
    return makeCamera({eye, target, up, fov: 50, near: 0.05, far: 1e5}, W, H);
  };
  const cam = camAt(f);
  const prevCam = camAt(f - 1.4 * (1 - smoothstep(30, 90, f)));
  const camDist = Math.max(cam.project(MW.center).depth, 0.1);

  const t = 0.3 + f * 0.0007;
  const sets = useMemo((): ParticleSet[] => {
    const sp = placeCloud(mw.stars, R, t, MW, new Float32Array(mw.stars.n * 3));
    const gp = placeCloud(glow, R, t, MW, new Float32Array(glow.n * 3));
    const hp = placeCloud(mw.hii, R, t, MW, new Float32Array(mw.hii.n * 3));
    const dp = placeCloud(mw.dust, R, t, MW, new Float32Array(mw.dust.n * 3));
    const out: ParticleSet[] = [
      {positions: gp, colors: glow.col, sizes: glow.size, minPx: 2, maxPx: 120, intensity: 0.045, nearFade: [25, 70]},
      {positions: sp, colors: mw.stars.col, sizes: mw.stars.size, minPx: 0.7, maxPx: 5, intensity: 0.85, streakDim: 0.75, nearFade: [0.8, 4]},
      {positions: hp, colors: mw.hii.col, sizes: mw.hii.size, minPx: 0.8, maxPx: 12, intensity: 0.7, nearFade: [0.8, 4]},
      {positions: dp, colors: mw.dust.col, sizes: mw.dust.size, blend: 'subtract', minPx: 1, maxPx: 30, intensity: 1, nearFade: [1, 5]},
    ];
    if (f > 400) {
      const a = placeCloud(m31.stars, 95, t, M31, new Float32Array(m31.stars.n * 3));
      const ad = placeCloud(m31.dust, 95, t, M31, new Float32Array(m31.dust.n * 3));
      const ah = placeCloud(m31.hii, 95, t, M31, new Float32Array(m31.hii.n * 3));
      const vis = smoothstep(420, 500, f);
      out.push(
        {positions: a, colors: m31.stars.col, sizes: m31.stars.size, minPx: 0.7, intensity: 1.1 * vis},
        {positions: ah, colors: m31.hii.col, sizes: m31.hii.size, minPx: 0.8, intensity: 0.8 * vis},
        {positions: ad, colors: m31.dust.col, sizes: m31.dust.size, blend: 'subtract', minPx: 1, intensity: 1.1 * vis},
      );
    }
    return out;
  }, [mw, m31, glow, t, f]);

  // Galactic core glow.
  const core = cam.project(MW.center);
  const coreR = Math.min((cam.focalPx / Math.max(core.depth, 0.01)) * R * 0.2, M * 0.9);
  const m31c = cam.project(M31.center);
  const m31R = (cam.focalPx / Math.max(m31c.depth, 0.01)) * 95 * 0.2;

  // The Sun: 26,000 light years out, between two arms.
  const sunTh = Math.log(26 / (R * 0.08)) / Math.tan((13 * Math.PI) / 180) + Math.PI / 4;
  const sunW = placePoint(26, sunTh, R, t, MW);
  const sun = cam.project(sunW);
  const hereA = smoothstep(318, 336, f) * (1 - smoothstep(440, 460, f));
  const orbitA = smoothstep(370, 395, f) * (1 - smoothstep(445, 465, f));
  const orbitPath = (() => {
    let d = '';
    for (let k = 0; k <= 120; k++) {
      const p = cam.project(placePoint(26, (k / 120) * Math.PI * 2, R, 0, MW));
      d += `${k ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
    return d;
  })();
  // a light dot running around the orbit: one lap = 230 million years
  const lap = easeInOut(prog(f, 382, 440));
  const runner = cam.project(placePoint(26, sunTh + lap * Math.PI * 2, R, t, MW));

  // 100,000 light-year ruler
  const rulerA = smoothstep(236, 256, f) * (1 - smoothstep(310, 325, f));
  const ra = cam.project(placePoint(R, -0.6, R, 0, MW));
  const rb = cam.project(placePoint(R, Math.PI - 0.6, R, 0, MW));

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <StarField seed={55} yaw={0.6 + f * 0.0008} pitch={0.3} brightness={0.35} band={0} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="mwcore">
            <stop offset="0" stopColor="#fff4dc" stopOpacity="0.95" />
            <stop offset="0.15" stopColor="#ffd59a" stopOpacity="0.55" />
            <stop offset="0.45" stopColor="#d98b4a" stopOpacity="0.16" />
            <stop offset="1" stopColor="#7a3a1a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="m31core">
            <stop offset="0" stopColor="#ffeccc" stopOpacity="0.9" />
            <stop offset="0.3" stopColor="#ffc890" stopOpacity="0.3" />
            <stop offset="1" stopColor="#ffb070" stopOpacity="0" />
          </radialGradient>
        </defs>
        {core.depth > 0 ? <circle cx={core.x} cy={core.y} r={coreR} fill="url(#mwcore)" opacity={lerp(0.25, 1, smoothstep(60, 240, f))} style={{mixBlendMode: 'screen'}} /> : null}
        {f > 400 && m31c.depth > 0 ? <circle cx={m31c.x} cy={m31c.y} r={m31R} fill="url(#m31core)" opacity={smoothstep(420, 500, f)} /> : null}
      </svg>
      <ParticleLayer camera={cam} prevCamera={prevCam} sets={sets} hdr={1.25 * clamp(Math.pow(camDist / 125, 0.6), 0.22, 1)} />
      {/* overlays */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g opacity={rulerA} stroke="rgba(255,236,200,0.9)" strokeWidth={2}>
          <line x1={ra.x} y1={ra.y} x2={lerp(ra.x, rb.x, easeOut(prog(f, 236, 270)))} y2={lerp(ra.y, rb.y, easeOut(prog(f, 236, 270)))} />
          <circle cx={ra.x} cy={ra.y} r={5} fill="#ffecc8" />
          <circle cx={rb.x} cy={rb.y} r={5} fill="#ffecc8" opacity={smoothstep(262, 272, f)} />
        </g>
        <path d={orbitPath} fill="none" stroke="rgba(160,220,255,0.7)" strokeWidth={2} strokeDasharray="10 8" opacity={orbitA} />
        <circle cx={runner.x} cy={runner.y} r={7} fill="#cfefff" opacity={orbitA * (lap > 0 && lap < 1 ? 1 : 0)} style={{filter: 'drop-shadow(0 0 10px #8fd8ff)'}} />
        <g opacity={hereA}>
          <circle cx={sun.x} cy={sun.y} r={6} fill="#fff6c8" />
          <circle cx={sun.x} cy={sun.y} r={14 + 26 * ((f % 40) / 40)} fill="none" stroke="#fff6c8" strokeWidth={2} opacity={1 - (f % 40) / 40} />
          <line x1={sun.x} y1={sun.y - 10} x2={sun.x + 70} y2={sun.y - 110} stroke="#fff6c8" strokeWidth={2} />
          <line x1={sun.x + 70} y1={sun.y - 110} x2={sun.x + 200} y2={sun.y - 110} stroke="#fff6c8" strokeWidth={2} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: sun.x + 76, top: sun.y - 168, opacity: hereA}}>
        <Label size={0.042} weight={500} color="#fff6c8">
          {S.milky.here}
        </Label>
      </div>
      <div style={{position: 'absolute', left: (ra.x + rb.x) / 2, top: (ra.y + rb.y) / 2 + 24, transform: 'translateX(-50%)', opacity: rulerA * smoothstep(262, 275, f)}}>
        <Mono size={0.03} color="#ffecc8">
          100,000 光年
        </Mono>
      </div>
      {f > 470 ? (
        <>
          <div style={{position: 'absolute', left: m31c.x, top: m31c.y + m31R * 1.4 + 20, transform: 'translateX(-50%)', opacity: smoothstep(480, 505, f)}}>
            <Label size={0.032}>{S.milky.andromeda}</Label>
          </div>
          <div style={{position: 'absolute', left: core.x, top: core.y + 40, transform: 'translateX(-50%)', opacity: smoothstep(480, 505, f)}}>
            <Label size={0.032}>{S.milky.title}</Label>
          </div>
        </>
      ) : null}
      <Vignette strength={0.55} />
      <Sequence from={40} durationInFrames={120}>
        <Title kicker={S.milky.kicker} title={S.milky.title} en={S.milky.en} dur={120} pos={portrait ? 'top' : 'upper'} size={0.17} />
      </Sequence>
      <Sequence from={160} durationInFrames={76}>
        <Line text={S.milky.f1} dur={76} pos={portrait ? 0.84 : 'bottom'} />
      </Sequence>
      <Sequence from={238} durationInFrames={80}>
        <Line text={S.milky.f2} dur={80} pos={portrait ? 0.84 : 'bottom'} />
      </Sequence>
      <Sequence from={372} durationInFrames={78}>
        <Line text={S.milky.f3} dur={78} pos={portrait ? 0.8 : 'lower'} size={0.044} />
        <Line text={S.milky.f4} dur={78} pos={portrait ? 0.86 : 'bottom'} size={0.04} delay={20} color="#cfe6ff" />
      </Sequence>
      <Sequence from={478} durationInFrames={92}>
        <Line text={S.milky.f5} dur={92} pos={portrait ? 0.47 : 'bottom'} size={0.044} />
      </Sequence>
      <AbsoluteFill style={{background: '#000', opacity: 1 - clamp(f / 24)}} />
    </AbsoluteFill>
  );
};
