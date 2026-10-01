import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp, noise1} from '../lib/math';

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.75}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength * 0.6}) 80%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: 'none',
    }}
  />
);

// Full-frame flash. `at` is the peak frame; the flash rises fast and decays exponentially.
export const Flash: React.FC<{at: number; rise?: number; decay?: number; color?: string; peak?: number}> = ({
  at,
  rise = 3,
  decay = 18,
  color = '255,255,255',
  peak = 1,
}) => {
  const f = useCurrentFrame();
  let a = 0;
  if (f >= at - rise && f < at) a = (f - (at - rise)) / rise;
  else if (f >= at) a = Math.exp(-(f - at) / decay);
  a *= peak;
  if (a < 0.002) return null;
  return <AbsoluteFill style={{background: `rgba(${color},${clamp(a)})`, pointerEvents: 'none', mixBlendMode: 'screen'}} />;
};

// Camera shake whose amplitude is driven by a list of impacts.
export const useShake = (impacts: {at: number; power: number; decay?: number}[], base = 0) => {
  const f = useCurrentFrame();
  let amp = base;
  for (const im of impacts) {
    if (f >= im.at) amp += im.power * Math.exp(-(f - im.at) / (im.decay ?? 12));
  }
  return {
    x: noise1(f * 0.9 + 3.1) * amp,
    y: noise1(f * 0.9 + 17.3) * amp,
    r: noise1(f * 0.5 + 41.7) * amp * 0.02,
  };
};

export const Shake: React.FC<{impacts: {at: number; power: number; decay?: number}[]; base?: number; children: React.ReactNode}> = ({
  impacts,
  base,
  children,
}) => {
  const s = useShake(impacts, base);
  return <AbsoluteFill style={{transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg) scale(${1 + Math.min(Math.hypot(s.x, s.y) * 0.002, 0.04)})`}}>{children}</AbsoluteFill>;
};

// Opacity envelope for a scene: fades in and out over the given frame counts.
export const Fade: React.FC<{dur: number; fadeIn?: number; fadeOut?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  dur,
  fadeIn = 0,
  fadeOut = 0,
  children,
  style,
}) => {
  const f = useCurrentFrame();
  const a = Math.min(fadeIn ? clamp(f / fadeIn) : 1, fadeOut ? clamp((dur - f) / fadeOut) : 1);
  return <AbsoluteFill style={{opacity: a, ...style}}>{children}</AbsoluteFill>;
};
