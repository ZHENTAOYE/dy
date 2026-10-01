import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ShaderLayer} from '../lib/ShaderLayer';
import {EARTH_FRAG} from '../shaders/earth';
import {WarpField} from '../components/WarpField';
import {StarField} from '../components/StarField';
import {Line, Title, useLayout} from '../components/Text';
import {Vignette} from '../components/Fx';
import {SANS} from '../fonts';
import {S} from '../script';
import {warpSpeed, warpTravel} from './BigBang';
import {clamp, easeInOut, lerp, logLerp, norm, prog, smoothstep, V3} from '../lib/math';
import {FINALE_DUR, ARRIVE, BANG_DUR} from '../timing';


export const Finale: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width: W, height: H, portrait, S: M} = useLayout();

  // Warp: inherit the Big Bang's speed and brake to a stop.
  const v0 = warpSpeed(BANG_DUR);
  const T0 = warpTravel(BANG_DUR);
  const D = 150;
  const u = clamp(f / D);
  const travel = T0 + ((v0 * D) / 3) * (1 - Math.pow(1 - u, 3));
  const speed = v0 * Math.pow(1 - u, 2);
  const warpA = 1 - smoothstep(ARRIVE - 20, ARRIVE + 25, f);

  // Earth: sunrise over the limb, then a slow pull back to the whole night-lit globe.
  const pB = easeInOut(prog(f, 420, 560));
  const bigR = 1.7 * Math.max(W, H);
  const globeR = (portrait ? 0.36 : 0.3) * M;
  const R = logLerp(bigR, globeR, pB);
  const horizonY = lerp(0.7 * H, 0.52 * H - globeR, pB);
  const cx = W / 2;
  const cy = pB < 0.999 ? lerp(horizonY + R, 0.52 * H, smoothstep(0.7, 1, pB)) : 0.52 * H;
  const rise = smoothstep(ARRIVE + 10, ARRIVE + 120, f);
  const sunPx: [number, number] = [W * 0.4, lerp(horizonY + 0.03 * H, horizonY - 0.03 * H, rise)];
  const toSun = [sunPx[0] - cx, -(sunPx[1] - cy)];
  const ls = Math.hypot(toSun[0], toSun[1]) || 1;
  const Lrise: V3 = norm([(toSun[0] / ls) * 0.32, (toSun[1] / ls) * 0.32, -0.95]);
  const Lend: V3 = norm([0.9, 0.25, -0.35]);
  const L = norm([lerp(Lrise[0], Lend[0], pB), lerp(Lrise[1], Lend[1], pB), lerp(Lrise[2], Lend[2], pB)] as V3);
  const sunR = 0.012 * M;
  const clear = Math.hypot(sunPx[0] - cx, sunPx[1] - cy) - R;
  const sunVis = clamp((clear + sunR) / (2 * sunR)) * (1 - smoothstep(0.1, 0.6, pB));
  const earthA = smoothstep(ARRIVE - 10, ARRIVE + 30, f);
  const end = 1 - smoothstep(FINALE_DUR - 30, FINALE_DUR - 2, f);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: end}}>
        {warpA > 0.001 ? (
          <AbsoluteFill style={{opacity: warpA}}>
            <WarpField travel={travel} speed={speed} seed={77} count={7000} hue="blue" brightness={1.1} hdr={1.1} />
          </AbsoluteFill>
        ) : null}
        {earthA > 0.001 ? (
          <AbsoluteFill style={{opacity: earthA}}>
            <StarField seed={11} yaw={0.2 + f * 0.0004} pitch={0.15} brightness={0.85} />
            <ShaderLayer
              frag={EARTH_FRAG}
              time={f / fps}
              uniforms={{
                uCenter: [cx, cy],
                uRadius: R,
                uRot: 4.1 + f * 0.003,
                uCloudRot: 4.5 + f * 0.0036,
                uSun: L,
                uMoonC: [0, 0],
                uMoonR: 0.0001,
                uSunPx: sunPx,
                uSunVis: sunVis,
                uGlare: 1.3,
                uExposure: 1.15,
                uAtmo: 1,
              }}
            />
          </AbsoluteFill>
        ) : null}
        <Vignette strength={0.6} />
      </AbsoluteFill>
      <Sequence from={24} durationInFrames={100}>
        <Line text={S.finale.f1} dur={100} pos="center" size={0.075} font="serif" weight={700} />
      </Sequence>
      <Sequence from={168} durationInFrames={88}>
        <Line text={S.finale.f2} dur={88} pos={portrait ? 'upper' : 'upper'} size={0.046} />
      </Sequence>
      <Sequence from={258} durationInFrames={84}>
        <Line text={S.finale.f3} dur={84} pos={portrait ? 'upper' : 'upper'} size={0.046} />
      </Sequence>
      <Sequence from={344} durationInFrames={84}>
        <Line text={S.finale.f4} dur={84} pos={portrait ? 'upper' : 'upper'} size={portrait ? 0.04 : 0.042} />
      </Sequence>
      <Sequence from={432} durationInFrames={92}>
        <Line text={S.finale.q1} dur={92} pos={portrait ? 0.15 : 'top'} size={0.054} font="serif" weight={700} stagger={2} />
        <Line text={S.finale.q2} dur={92} pos={portrait ? 0.205 : 0.22} size={0.034} delay={34} color="#cfd8ff" />
      </Sequence>
      <Sequence from={520} durationInFrames={FINALE_DUR - 520}>
        <Title title={S.finale.title} en={S.finale.en} dur={FINALE_DUR - 520 - 4} pos={portrait ? 'top' : 'upper'} size={0.2} />
      </Sequence>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div
          style={{
            position: 'absolute',
            width: W,
            top: (portrait ? 0.85 : 0.88) * H,
            textAlign: 'center',
            fontFamily: SANS,
            fontWeight: 300,
            fontSize: 0.034 * M,
            letterSpacing: '0.3em',
            color: 'rgba(225,232,255,0.9)',
            opacity: smoothstep(546, 566, f) * (1 - smoothstep(FINALE_DUR - 16, FINALE_DUR - 2, f)),
            textShadow: '0 0 12px rgba(0,0,0,0.9)',
          }}
        >
          {S.finale.end}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
