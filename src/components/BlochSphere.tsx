import React from 'react';
import {alpha, C, FONT, mix} from '../theme';
import {GlowPath, Orb} from './fx';

type Pt = {sx: number; sy: number; depth: number};

export type BlochProps = {
  id: string;
  cx: number;
  cy: number;
  r: number;
  /** 绕竖直轴旋转（弧度） */
  yaw: number;
  /** 俯视角（弧度） */
  elev?: number;
  theta: number;
  phi: number;
  /** 态矢量长度：1=纯态，<1 表示退相干 */
  len?: number;
  color?: string;
  danger?: number;
  appear?: number;
  trail?: {theta: number; phi: number; len?: number}[];
  hl0?: number;
  hl1?: number;
  labels?: 'z' | 'x' | 'none';
};

const LATS = [-60, -30, 0, 30, 60];
const LONS = [0, 30, 60, 90, 120, 150];

export const BlochSphere: React.FC<BlochProps> = ({
  id,
  cx,
  cy,
  r,
  yaw,
  elev = 0.36,
  theta,
  phi,
  len = 1,
  color = C.cyan,
  danger = 0,
  appear = 1,
  trail,
  hl0 = 0,
  hl1 = 0,
  labels = 'z',
}) => {
  const col = mix(color, C.red, danger);
  const ce = Math.cos(elev);
  const se = Math.sin(elev);
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const P = (x: number, y: number, z: number): Pt => {
    const x1 = x * cyw - y * syw;
    const y1 = x * syw + y * cyw;
    const up = z * ce + y1 * se;
    return {sx: cx + r * x1 * appear, sy: cy - r * up * appear, depth: -y1 * ce + z * se};
  };

  const split = (pts: Pt[]) => {
    const out = {f: '', b: ''};
    let cur: 'f' | 'b' | null = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const side = (a.depth + b.depth) / 2 >= 0 ? 'f' : 'b';
      if (side !== cur) {
        out[side] += `M${a.sx.toFixed(1)},${a.sy.toFixed(1)}`;
        cur = side;
      }
      out[side] += `L${b.sx.toFixed(1)},${b.sy.toFixed(1)}`;
    }
    return out;
  };

  const N = 72;
  const circles: {f: string; b: string; main: boolean}[] = [];
  for (const lat of LATS) {
    const la = (lat * Math.PI) / 180;
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      pts.push(P(Math.cos(la) * Math.cos(t), Math.cos(la) * Math.sin(t), Math.sin(la)));
    }
    circles.push({...split(pts), main: lat === 0});
  }
  for (const lon of LONS) {
    const lo = (lon * Math.PI) / 180;
    const pts: Pt[] = [];
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * Math.PI * 2;
      pts.push(P(Math.sin(s) * Math.cos(lo), Math.sin(s) * Math.sin(lo), Math.cos(s)));
    }
    circles.push({...split(pts), main: false});
  }

  const o = P(0, 0, 0);
  const vec = (th: number, ph: number, l: number) =>
    P(l * Math.sin(th) * Math.cos(ph), l * Math.sin(th) * Math.sin(ph), l * Math.cos(th));
  const tip = vec(theta, phi, len);
  const shadow = P(len * Math.sin(theta) * Math.cos(phi), len * Math.sin(theta) * Math.sin(phi), 0);

  const dx = tip.sx - o.sx;
  const dy = tip.sy - o.sy;
  const L = Math.hypot(dx, dy);
  const hs = r * 0.09;
  const ux = L > 1 ? dx / L : 0;
  const uy = L > 1 ? dy / L : -1;
  const base = {x: tip.sx - ux * hs, y: tip.sy - uy * hs};
  const head = `M${tip.sx},${tip.sy}L${base.x - uy * hs * 0.55},${base.y + ux * hs * 0.55}L${base.x + uy * hs * 0.55},${base.y - ux * hs * 0.55}Z`;

  const z0 = P(0, 0, 1.22);
  const z1 = P(0, 0, -1.22);
  const ax = (a: Pt, b: Pt) => `M${a.sx},${a.sy}L${b.sx},${b.sy}`;
  const fs = r * 0.17;

  const lbl = (pt: Pt, text: string, h: number, dyy: number) => (
    <text
      x={pt.sx}
      y={pt.sy + dyy}
      textAnchor="middle"
      fontFamily={FONT.math}
      fontSize={fs * (1 + h * 0.45)}
      fill={h > 0.05 ? mix(C.white, C.gold, h) : alpha(C.white, 0.85)}
      style={{
        filter: h > 0.05 ? `drop-shadow(0 0 ${12 * h}px ${C.gold})` : undefined,
      }}
      opacity={appear}
    >
      {text}
    </text>
  );

  return (
    <g>
      <defs>
        <radialGradient id={`${id}-fill`} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor={alpha(col, 0.28)} />
          <stop offset="55%" stopColor={alpha(col, 0.07)} />
          <stop offset="100%" stopColor={alpha(col, 0.18)} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="70%" stopColor={alpha(col, 0)} />
          <stop offset="83%" stopColor={alpha(col, 0.22)} />
          <stop offset="100%" stopColor={alpha(col, 0)} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.22 * appear} fill={`url(#${id}-halo)`} />
      {circles.map((c, i) => (
        <path
          key={`b${i}`}
          d={c.b}
          fill="none"
          stroke={alpha(col, 0.22)}
          strokeWidth={1.5}
          strokeDasharray="5 7"
        />
      ))}
      <circle cx={cx} cy={cy} r={r * appear} fill={`url(#${id}-fill)`} />
      <path d={ax(z1, z0)} stroke={alpha(C.white, 0.35)} strokeWidth={2} strokeDasharray="8 8" />
      <path d={ax(P(-1.15, 0, 0), P(1.15, 0, 0))} stroke={alpha(C.white, 0.2)} strokeWidth={1.5} strokeDasharray="6 8" />
      <path d={ax(P(0, -1.15, 0), P(0, 1.15, 0))} stroke={alpha(C.white, 0.2)} strokeWidth={1.5} strokeDasharray="6 8" />
      {circles.map((c, i) => (
        <path
          key={`f${i}`}
          d={c.f}
          fill="none"
          stroke={alpha(col, c.main ? 0.9 : 0.5)}
          strokeWidth={c.main ? 3 : 1.8}
        />
      ))}
      <circle
        cx={cx}
        cy={cy}
        r={r * appear}
        fill="none"
        stroke={alpha(col, 0.85)}
        strokeWidth={3}
        style={{filter: `drop-shadow(0 0 10px ${col})`}}
      />
      {trail && trail.length > 1 && (
        <g fill="none" strokeLinecap="round">
          {trail.slice(1).map((t, i) => {
            const a = vec(trail[i].theta, trail[i].phi, trail[i].len ?? len);
            const b = vec(t.theta, t.phi, t.len ?? len);
            const k = (i + 1) / trail.length;
            return (
              <line
                key={i}
                x1={a.sx}
                y1={a.sy}
                x2={b.sx}
                y2={b.sy}
                stroke={mix(C.magenta, C.gold, k)}
                strokeWidth={2 + k * 7}
                opacity={k * 0.9}
              />
            );
          })}
        </g>
      )}
      <path
        d={`M${o.sx},${o.sy}L${shadow.sx},${shadow.sy}L${tip.sx},${tip.sy}`}
        fill="none"
        stroke={alpha(C.gold, 0.45)}
        strokeWidth={2}
        strokeDasharray="6 6"
        opacity={appear}
      />
      <GlowPath d={`M${o.sx},${o.sy}L${base.x},${base.y}`} color={mix(C.gold, C.red, danger)} width={r * 0.022} opacity={appear} />
      <path d={head} fill={mix(C.gold, C.red, danger)} opacity={appear} style={{filter: `drop-shadow(0 0 8px ${C.gold})`}} />
      <Orb id={`${id}-tip`} x={tip.sx} y={tip.sy} r={r * 0.045} color={mix(C.gold, C.red, danger)} halo={4} />
      <Orb id={`${id}-o`} x={o.sx} y={o.sy} r={r * 0.025} color={col} halo={3} />
      {labels === 'z' && (
        <>
          {lbl(z0, '|0⟩', hl0, -fs * 0.25)}
          {lbl(z1, '|1⟩', hl1, fs * 0.95)}
        </>
      )}
      {labels === 'x' && (
        <>
          {lbl(P(1.38, 0, 0), '|+⟩', hl0, fs * 0.35)}
          {lbl(P(-1.38, 0, 0), '|−⟩', hl1, fs * 0.35)}
        </>
      )}
    </g>
  );
};
