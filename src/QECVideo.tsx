import React from 'react';
import {AbsoluteFill, interpolate, Sequence, useCurrentFrame} from 'remotion';
import {Background} from './components/Background';
import {Flash, GlitchBars} from './components/fx';
import {Overlay} from './components/Overlay';
import {Soundtrack} from './Soundtrack';
import {SCENES} from './timeline';
import {mix} from './theme';

/** 场景切换处的颜色平滑过渡 */
const useTint = (frame: number) => {
  const i = Math.max(0, SCENES.findIndex((s) => frame < s.start + s.dur));
  const s = SCENES[i];
  const prev = SCENES[Math.max(0, i - 1)];
  const t = interpolate(frame, [s.start - 4, s.start + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {
    tintA: mix(prev.tintA, s.tintA, t),
    tintB: mix(prev.tintB, s.tintB, t),
    danger: (prev.danger ?? 0) * (1 - t) + (s.danger ?? 0) * t,
  };
};

export const QECVideo: React.FC<{sfx?: boolean}> = ({sfx = true}) => {
  const frame = useCurrentFrame();
  const tint = useTint(frame);
  const cut = SCENES.slice(1).reduce((v, s) => {
    const d = frame - s.start;
    return Math.max(v, interpolate(d, [-3, 0, 7], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  }, 0);

  return (
    <AbsoluteFill style={{backgroundColor: '#02030a'}}>
      <Background {...tint} />
      {SCENES.map((s) => (
        <Sequence key={s.id} name={s.id} from={s.start} durationInFrames={s.dur}>
          <s.component />
        </Sequence>
      ))}
      <GlitchBars intensity={cut * 0.9} seed="cut" />
      <Flash opacity={cut * 0.55} />
      <Overlay />
      {sfx && <Soundtrack />}
    </AbsoluteFill>
  );
};
