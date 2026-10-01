import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CLAMP, easeIn, easeOut, shake} from '../lib/anim';

/** 每个场景的统一外壳：冲入（放大→归位）、退出（加速放大淡出）、震屏 */
export const SceneShell: React.FC<{children: React.ReactNode; hits?: number[]; amp?: number}> = ({
  children,
  hits = [],
  amp = 26,
}) => {
  const f = useCurrentFrame();
  const {durationInFrames: dur} = useVideoConfig();
  const inT = interpolate(f, [0, 14], [0, 1], {...CLAMP, easing: easeOut});
  const outT = interpolate(f, [dur - 9, dur], [0, 1], {...CLAMP, easing: easeIn});
  const scale = 1.14 - 0.14 * inT + 0.12 * outT;
  const opacity = Math.min(interpolate(f, [0, 5], [0, 1], CLAMP), 1 - outT);
  const s = shake(f, hits, amp);
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg) scale(${scale})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
