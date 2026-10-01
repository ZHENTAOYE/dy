import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ShaderLayer} from '../lib/ShaderLayer';
import {EARTH_FRAG} from '../shaders/earth';
import {StarField} from '../components/StarField';
import {Line, Title, Mono, Label, useLayout} from '../components/Text';
import {Vignette} from '../components/Fx';
import {S} from '../script';
import {clamp, easeInOut, lerp, logLerp, norm, prog, smoothstep, V3} from '../lib/math';
import {EARTH_DUR, LAP_START, BEAM_START} from '../timing';

// Light needs exactly 1 s for 7.5 laps and 1.3 s to reach the Moon; both play in real time.

export const Earth: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width: W, height: H, portrait, S: M} = useLayout();

  // Phase A: orbital sunrise over the limb. Phase B: pull back to the full globe. Phase C: Earth & Moon.
  const pB = easeInOut(prog(f, 95, 250));
  const pC = easeInOut(prog(f, 300, 380));

  const bigR = 1.7 * Math.max(W, H);
  const globeR = (portrait ? 0.36 : 0.3) * M;
  const earthFinal: [number, number] = portrait ? [0.3 * W, 0.27 * H] : [0.2 * W, 0.42 * H];
  const moonPos: [number, number] = portrait ? [0.74 * W, 0.8 * H] : [0.86 * W, 0.62 * H];
  const emDist = Math.hypot(moonPos[0] - earthFinal[0], moonPos[1] - earthFinal[1]);
  const tinyR = emDist / 60.3;

  let R = logLerp(bigR, globeR, pB);
  // Horizon height for the opening shot; then the globe settles to center.
  const horizonY = lerp(0.66 * H, 0.47 * H - globeR, pB);
  let cx = W / 2;
  let cy = lerp(horizonY + R, 0.47 * H, smoothstep(0.6, 1, pB));
  if (pB < 0.6) cy = horizonY + R;
  R = logLerp(R, tinyR, pC);
  cx = lerp(cx, earthFinal[0], pC);
  cy = lerp(cy, earthFinal[1], pC);

  // Sun: starts behind the planet (sunrise), swings to the upper-left front.
  const rise = smoothstep(10, 80, f);
  const sunPx: [number, number] = [W * 0.62, lerp(horizonY + 0.03 * H, horizonY - 0.035 * H, rise)];
  const toSun = [sunPx[0] - cx, -(sunPx[1] - cy)];
  const ls = Math.hypot(toSun[0], toSun[1]);
  const Lrise: V3 = norm([(toSun[0] / ls) * 0.32, (toSun[1] / ls) * 0.32, -0.95]);
  const Lday: V3 = norm([-0.95, 0.35, 0.55]);
  const L = norm([lerp(Lrise[0], Lday[0], pB), lerp(Lrise[1], Lday[1], pB), lerp(Lrise[2], Lday[2], pB)] as V3);
  // How much of the sun disc clears the limb.
  const sunR = 0.012 * M;
  const clear = Math.hypot(sunPx[0] - cx, sunPx[1] - cy) - R;
  const sunVis = clamp((clear + sunR) / (2 * sunR)) * (1 - smoothstep(0.05, 0.5, pB));

  const rot = f * 0.0035 + 2.2;
  const time = f / fps;

  // Light lap ring (exactly 30 frames for 7.5 laps).
  const lapT = (f - LAP_START) / fps;
  const showLap = lapT >= 0 && lapT <= 1.6;
  const beamT = (f - BEAM_START) / fps;

  const moonVis = smoothstep(305, 360, f);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <StarField seed={11} yaw={0.2 + f * 0.0004} pitch={0.15} brightness={0.75 + 0.25 * pB} />
      <ShaderLayer
        frag={EARTH_FRAG}
        time={time}
        uniforms={{
          uCenter: [cx, cy],
          uRadius: R,
          uRot: rot,
          uCloudRot: rot * 1.15 + 0.4,
          uSun: L,
          uMoonC: moonPos,
          uMoonR: tinyR * 0.273 * moonVis + 0.0001,
          uSunPx: sunPx,
          uSunVis: sunVis,
          uGlare: 1.3,
          uExposure: 1.15,
          uAtmo: 1,
        }}
      />
      {/* light circling the Earth */}
      {showLap ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 46}).map((_, i) => {
            const t = Math.min(lapT, 1) - i * 0.0022;
            if (t < 0) return null;
            const a = t * 7.5 * Math.PI * 2 - Math.PI / 2;
            const rr = R * 1.12;
            const fade = (1 - i / 46) * (lapT > 1 ? Math.max(0, 1 - (lapT - 1) * 2.5) : 1);
            return (
              <circle
                key={i}
                cx={cx + Math.cos(a) * rr}
                cy={cy + Math.sin(a) * rr}
                r={(i === 0 ? 0.012 : 0.007) * M}
                fill={`rgba(255,240,200,${fade})`}
                style={{filter: i === 0 ? `drop-shadow(0 0 ${0.02 * M}px #ffe9b0)` : undefined}}
              />
            );
          })}
        </svg>
      ) : null}
      {showLap ? (
        <div style={{position: 'absolute', left: cx - 200, width: 400, top: cy + R * 1.25, textAlign: 'center'}}>
          <Mono size={0.032} color="#ffe2b0">
            t = {Math.min(lapT, 1).toFixed(2)} s
          </Mono>
        </div>
      ) : null}
      {/* light beam Earth -> Moon */}
      {beamT >= 0 && beamT < 2.6 ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          {(() => {
            const t = clamp(beamT / 1.3);
            const hx = lerp(earthFinal[0], moonPos[0], t);
            const hy = lerp(earthFinal[1], moonPos[1], t);
            const fadeOut = 1 - clamp((beamT - 1.6) / 1);
            return (
              <g opacity={fadeOut}>
                <line x1={earthFinal[0]} y1={earthFinal[1]} x2={hx} y2={hy} stroke="rgba(255,236,190,0.55)" strokeWidth={2} />
                <circle cx={hx} cy={hy} r={0.009 * M} fill="#fff6dd" style={{filter: `drop-shadow(0 0 ${0.025 * M}px #ffd98a)`}} />
              </g>
            );
          })()}
        </svg>
      ) : null}
      {beamT >= 0 ? (
        <div
          style={{
            position: 'absolute',
            left: (earthFinal[0] + moonPos[0]) / 2 + 0.04 * W,
            top: (earthFinal[1] + moonPos[1]) / 2 - 0.02 * H,
            opacity: 1 - clamp((beamT - 2.4) / 0.6),
          }}
        >
          <Mono size={0.034} color="#ffe2b0">
            t = {clamp(beamT, 0, 1.3).toFixed(2)} s
          </Mono>
        </div>
      ) : null}
      {/* HUD reticles marking the two bodies */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: smoothstep(345, 370, f) * clamp((EARTH_DUR - f) / 15)}}>
        {[earthFinal, moonPos].map(([x, y], i) => {
          const rr = (i === 0 ? 0.045 : 0.03) * M * (1 + 0.6 * (1 - smoothstep(345, 375, f)));
          return (
            <g key={i} stroke="rgba(190,215,255,0.75)" fill="none" strokeWidth={1.5}>
              <circle cx={x} cy={y} r={rr} strokeDasharray={`${rr * 0.5} ${rr * 0.285}`} transform={`rotate(${f * 0.8} ${x} ${y})`} />
              <line x1={x - rr * 1.5} y1={y} x2={x - rr * 1.15} y2={y} />
              <line x1={x + rr * 1.15} y1={y} x2={x + rr * 1.5} y2={y} />
            </g>
          );
        })}
      </svg>
      {/* Moon label */}
      <div style={{position: 'absolute', left: moonPos[0], top: moonPos[1] + 0.03 * M, transform: 'translateX(-50%)', opacity: moonVis * clamp((EARTH_DUR - f) / 15)}}>
        <Label size={0.032}>{S.earth.moon}</Label>
      </div>
      <div
        style={{
          position: 'absolute',
          left: earthFinal[0],
          top: earthFinal[1] - tinyR - 0.06 * M,
          transform: 'translateX(-50%)',
          opacity: smoothstep(340, 365, f) * clamp((EARTH_DUR - f) / 15),
        }}
      >
        <Label size={0.032}>{S.earth.title}</Label>
      </div>
      <Vignette strength={0.6} />
      <Sequence from={18} durationInFrames={130}>
        <Title kicker={S.earth.kicker} title={S.earth.title} en={S.earth.en} dur={130} pos="upper" />
      </Sequence>
      <Sequence from={150} durationInFrames={78}>
        <Line text={S.earth.f1} dur={78} pos={portrait ? 0.86 : 'bottom'} />
      </Sequence>
      <Sequence from={LAP_START - 6} durationInFrames={80}>
        <Line text={S.earth.f2} dur={80} pos={portrait ? 0.86 : 'bottom'} />
      </Sequence>
      <Sequence from={330} durationInFrames={EARTH_DUR - 330}>
        <Line text={S.earth.f3} dur={EARTH_DUR - 330} pos={portrait ? 0.6 : 'top'} size={0.044} align={portrait ? 'left' : 'center'} x={0.17} />
      </Sequence>
      <Sequence from={BEAM_START + 10} durationInFrames={EARTH_DUR - BEAM_START - 10}>
        <Line text={S.earth.f4} dur={EARTH_DUR - BEAM_START - 10} pos={portrait ? 0.665 : 'upper'} size={0.044} align={portrait ? 'left' : 'center'} x={0.17} />
      </Sequence>
    </AbsoluteFill>
  );
};
