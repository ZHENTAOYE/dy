import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ShaderLayer} from '../lib/ShaderLayer';
import {SUN_FRAG} from '../shaders/sun';
import {StarField} from '../components/StarField';
import {Line, Title, Stat, Label, useLayout} from '../components/Text';
import {Flash, Shake, Vignette} from '../components/Fx';
import {S} from '../script';
import {clamp, easeInOut, easeOut, lerp, logLerp, prog, smoothstep} from '../lib/math';
import {SUN_DUR, SUN_FLARE_PEAK} from '../timing';


export const Sun: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {width: W, height: H, portrait, S: M} = useLayout();

  // Approach: a blinding point resolves into a disc.
  const pA = easeOut(prog(f, 0, 75));
  const discR = (portrait ? 0.43 : 0.36) * M;
  let R = logLerp(0.004 * M, discR, pA);
  let cx = W / 2;
  let cy = lerp(0.5 * H, (portrait ? 0.47 : 0.52) * H, pA);

  // Dive toward the limb: zoom about the top of the disc, then park the limb low in frame.
  const pZ = easeInOut(prog(f, 285, 400));
  const k = logLerp(1, portrait ? 5.5 : 6.5, pZ);
  const pvx = cx + Math.sin(-0.25) * R;
  const pvy = cy - Math.cos(-0.25) * R;
  const targetX = lerp(pvx, W * 0.5, pZ);
  const targetY = lerp(pvy, H * (portrait ? 0.62 : 0.7), pZ);
  cx = targetX + (cx - pvx) * k;
  cy = targetY + (cy - pvy) * k;
  R = R * k;

  const glare = lerp(1.6, 0.03, smoothstep(0, 80, f)) * (1 - pZ * 0.8);
  const flare = easeOut(prog(f, 375, 470));
  const flareAng = Math.PI / 2 + 0.25 + 0.05; // just left of the parked limb point

  // Earth transit for scale.
  const tr = prog(f, 85, 275);
  const earthR = Math.max(R / 109, 2.2);
  const ex = cx + lerp(-1.15, 1.15, tr) * R;
  const ey = cy + 0.38 * R;
  const showEarth = f > 85 && f < 280;
  const tagA = smoothstep(105, 125, f) * (1 - smoothstep(250, 270, f));

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake impacts={[{at: SUN_FLARE_PEAK - 30, power: 10, decay: 30}, {at: SUN_FLARE_PEAK, power: 26, decay: 14}]}>
        <StarField seed={21} yaw={1.1 + f * 0.0003} pitch={-0.2} brightness={0.35} />
        <ShaderLayer
          frag={SUN_FRAG}
          time={f / fps + 3}
          uniforms={{
            uCenter: [cx, cy],
            uRadius: R,
            uGlare: glare,
            uExposure: 0.95,
            uFlare: flare,
            uFlareAng: flareAng,
            uDetail: lerp(1, 0.45, pZ),
          }}
        />
        {showEarth ? (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            <circle cx={ex} cy={ey} r={earthR} fill="#000" />
            <g opacity={tagA} stroke="rgba(255,255,255,0.85)" strokeWidth={1.6} fill="none">
              <circle cx={ex} cy={ey} r={earthR * 6} strokeDasharray="6 5" />
              <polyline points={`${ex + earthR * 4.3},${ey - earthR * 4.3} ${ex + 0.07 * M},${ey - 0.12 * M} ${ex + 0.2 * M},${ey - 0.12 * M}`} />
            </g>
          </svg>
        ) : null}
        {showEarth ? (
          <div style={{position: 'absolute', left: ex + 0.08 * M, top: ey - 0.12 * M - 0.05 * M, opacity: tagA}}>
            <Label size={0.034} weight={500} color="#fff">
              {S.sun.earthTag}
            </Label>
          </div>
        ) : null}
      </Shake>
      <Vignette strength={0.5} />
      <Sequence from={22} durationInFrames={120}>
        <Title kicker={S.sun.kicker} title={S.sun.title} en={S.sun.en} dur={120} pos={portrait ? 'top' : 'upper'} />
      </Sequence>
      <Sequence from={190} durationInFrames={95}>
        <Stat label={S.sun.statLabel} value={1300000} unit={S.sun.statUnit} dur={95} pos={portrait ? 0.86 : 'bottom'} size={0.13} />
      </Sequence>
      <Sequence from={292} durationInFrames={70}>
        <Line text={S.sun.f1} dur={70} pos={portrait ? 0.22 : 'top'} />
      </Sequence>
      <Sequence from={362} durationInFrames={78}>
        <Line text={S.sun.f2} dur={78} pos={portrait ? 0.22 : 'top'} size={0.046} />
      </Sequence>
      <Flash at={SUN_FLARE_PEAK} rise={10} decay={40} color="255,236,210" />
      <AbsoluteFill style={{background: '#fff', opacity: clamp((f - (SUN_DUR - 18)) / 18) * 0}} />
    </AbsoluteFill>
  );
};
