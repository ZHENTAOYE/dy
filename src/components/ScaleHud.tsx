import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {MONO, SANS} from '../fonts';
import {clamp, lerp, smoothstep} from '../lib/math';
import {S} from '../script';
import {useLayout} from './Text';

// A slim "cosmic ladder" on the left edge: the marker climbs powers of ten as the journey zooms out.
export type ScaleKey = [frame: number, log10m: number];

const lightTime = (meters: number) => {
  const s = meters / 2.998e8;
  const u = S.hud.units;
  if (s < 60) return `${s < 10 ? s.toFixed(2) : s.toFixed(0)} ${u[0]}`;
  if (s < 3600) return `${(s / 60).toFixed(0)} ${u[1]}`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(0)} ${u[2]}`;
  if (s < 3.156e7) return `${(s / 86400).toFixed(0)} ${u[3]}`;
  const y = s / 3.156e7;
  if (y < 1e4) return `${y < 10 ? y.toFixed(1) : y.toFixed(0)} ${u[4]}`;
  if (y < 1e8) return `${(y / 1e4).toFixed(y < 1e5 ? 1 : 0)} ${u[5]}`;
  return `${(y / 1e8).toFixed(0)} ${u[6]}`;
};

export const ScaleHud: React.FC<{keys: ScaleKey[]; from: number; to: number}> = ({keys, from, to}) => {
  const f = useCurrentFrame();
  const {width: W, height: H, portrait, S: M} = useLayout();
  const vis = smoothstep(from, from + 25, f) * (1 - smoothstep(to - 25, to, f));
  if (vis <= 0) return null;
  let v = keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (f >= f0 && f <= f1) {
      const t = (f - f0) / (f1 - f0);
      v = lerp(v0, v1, t * t * (3 - 2 * t));
    } else if (f > f1) v = v1;
  }
  const lo = 6;
  const hi = 27;
  const top = (portrait ? 0.34 : 0.26) * H;
  const bottom = (portrait ? 0.66 : 0.74) * H;
  const x = 0.035 * W;
  const yOf = (e: number) => lerp(bottom, top, (e - lo) / (hi - lo));
  const my = yOf(clamp(v, lo, hi));
  const ticks = [];
  for (let e = lo; e <= hi; e++) {
    const major = e % 5 === 2;
    ticks.push(<line key={e} x1={x} x2={x + (major ? 16 : 8)} y1={yOf(e)} y2={yOf(e)} stroke="rgba(200,215,255,0.5)" strokeWidth={major ? 1.6 : 1} />);
  }
  return (
    <AbsoluteFill style={{opacity: vis * 0.85, pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <line x1={x} x2={x} y1={top} y2={bottom} stroke="rgba(200,215,255,0.35)" strokeWidth={1} />
        <line x1={x} x2={x} y1={my} y2={bottom} stroke="rgba(255,217,160,0.85)" strokeWidth={2.5} />
        {ticks}
        <polygon points={`${x + 4},${my} ${x + 18},${my - 7} ${x + 18},${my + 7}`} fill="#ffd9a0" />
      </svg>
      <div style={{position: 'absolute', left: x + 24, top: my - 0.022 * M, lineHeight: 1.15}}>
        <div style={{fontFamily: MONO, fontSize: 0.026 * M, color: '#ffd9a0', whiteSpace: 'nowrap', textShadow: '0 0 8px #000'}}>
          10<sup style={{fontSize: '0.65em'}}>{Math.round(v)}</sup> m
        </div>
        <div style={{fontFamily: SANS, fontSize: 0.018 * M, color: 'rgba(210,222,255,0.8)', whiteSpace: 'nowrap', textShadow: '0 0 8px #000'}}>
          {S.hud.light} {lightTime(Math.pow(10, v))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
