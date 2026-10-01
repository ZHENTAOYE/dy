import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ShaderLayer} from '../lib/ShaderLayer';
import {BLACKHOLE_FRAG} from '../shaders/blackhole';
import {Line, Title, Mono, useLayout} from '../components/Text';
import {Flash, Shake, Vignette} from '../components/Fx';
import {S} from '../script';
import {easeIn, easeInOut, lerp, logLerp, orbit, prog, smoothstep} from '../lib/math';
import {BH_IGNITE} from '../timing';


export const BlackHole: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width: W, height: H, portrait} = useLayout();

  // Camera: drift in near the disk plane, swing over the top (EHT view), then fall in.
  const approach = easeInOut(prog(f, 0, 330));
  const swing = easeInOut(prog(f, 330, 400)) * (1 - easeInOut(prog(f, 430, 480)));
  const dive = easeIn(prog(f, 455, 585));
  const dist = logLerp(logLerp(34, 19, approach), 0.9, dive);
  const pitch = lerp(lerp(7, 11, approach), 72, swing) + dive * 6;
  const yaw = 20 + f * 0.06;
  const cam = orbit([0, 0, 0], dist, yaw, pitch);
  const fov = portrait ? lerp(62, 75, dive) : lerp(42, 55, dive);

  const disk = smoothstep(BH_IGNITE - 6, BH_IGNITE + 20, f);
  const stars = smoothstep(10, 60, f);
  const eht = smoothstep(372, 395, f) * (1 - smoothstep(425, 445, f));
  const blackout = smoothstep(570, 590, f);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake impacts={[{at: BH_IGNITE, power: 16, decay: 20}]} base={dive * 6}>
        <AbsoluteFill style={{filter: eht > 0.001 ? `blur(${eht * 22}px) sepia(${eht}) saturate(${1 + eht * 1.4}) hue-rotate(${-22 * eht}deg) brightness(${1 - eht * 0.15})` : undefined}}>
          <ShaderLayer
            frag={BLACKHOLE_FRAG}
            resolution={0.5}
            time={f / fps}
            uniforms={{
              uCam: cam,
              uTarget: [0, 0, 0],
              uFov: fov,
              uDisk: disk,
              uExposure: 1.05 + dive * 0.5,
              uRollDeg: -8 + f * 0.01,
              uStars: stars,
            }}
          />
        </AbsoluteFill>
      </Shake>
      {/* EHT-style caption frame */}
      <AbsoluteFill style={{opacity: eht, pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 0.08 * W, top: (portrait ? 0.2 : 0.12) * H}}>
          <Mono size={0.028} color="#ffcf8a">
            M87* · EVENT HORIZON TELESCOPE · 2019
          </Mono>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.7} />
      <Sequence from={8} durationInFrames={56}>
        <Line text={S.blackhole.pre} dur={56} pos="center" font="serif" weight={500} size={0.05} />
      </Sequence>
      <Sequence from={BH_IGNITE + 4} durationInFrames={110}>
        <Title title={S.blackhole.title} en={S.blackhole.en} dur={110} pos={portrait ? 'top' : 'upper'} size={0.2} />
      </Sequence>
      <Sequence from={186} durationInFrames={76}>
        <Line text={S.blackhole.f1} dur={76} pos={portrait ? 0.84 : 'bottom'} size={0.048} />
      </Sequence>
      <Sequence from={266} durationInFrames={90}>
        <Line text={S.blackhole.f2} dur={90} pos={portrait ? 0.84 : 'bottom'} size={0.048} />
      </Sequence>
      <Sequence from={364} durationInFrames={82}>
        <Line text={S.blackhole.f3} dur={82} pos={portrait ? 0.84 : 'bottom'} size={0.044} />
      </Sequence>
      <Sequence from={470} durationInFrames={105}>
        <Line text={S.blackhole.f4} dur={105} pos={portrait ? 0.84 : 'bottom'} size={0.044} />
      </Sequence>
      <Flash at={BH_IGNITE} rise={4} decay={16} color="255,214,170" peak={0.8} />
      <AbsoluteFill style={{background: '#000', opacity: blackout}} />
    </AbsoluteFill>
  );
};
