import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

const NOISE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}`;

/** 胶片颗粒 + 扫描线 + 暗角 */
export const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  const ox = Math.floor(random(`gx${frame}`) * 320);
  const oy = Math.floor(random(`gy${frame}`) * 320);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          backgroundImage: `url("${NOISE}")`,
          backgroundPosition: `${ox}px ${oy}px`,
          opacity: 0.09,
          mixBlendMode: 'overlay',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 2px, transparent 4px)',
        }}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 75% 60% at 50% 45%, transparent 55%, rgba(0,0,0,0.8) 100%)'}}
      />
    </AbsoluteFill>
  );
};
