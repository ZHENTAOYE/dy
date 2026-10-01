import React from 'react';
import {alpha, C} from '../theme';

export type Plaq = {
  key: string;
  type: 'X' | 'Z';
  /** 中心（格点坐标） */
  cx: number;
  cy: number;
  /** 内部方块 or 边界半圆 */
  kind: 'square' | 'top' | 'bottom' | 'left' | 'right';
  /** 方块左上角格点 (i, j) */
  i: number;
  j: number;
};

/** 旋转表面码：d×d 个数据比特，d²−1 个稳定子 */
export const buildLattice = (d: number): Plaq[] => {
  const out: Plaq[] = [];
  for (let j = 0; j < d - 1; j++) {
    for (let i = 0; i < d - 1; i++) {
      out.push({key: `s${i}-${j}`, type: (i + j) % 2 === 0 ? 'X' : 'Z', cx: i + 0.5, cy: j + 0.5, kind: 'square', i, j});
    }
  }
  for (let i = 0; i < d - 1; i++) {
    if (i % 2 === 1) out.push({key: `t${i}`, type: 'X', cx: i + 0.5, cy: -0.25, kind: 'top', i, j: -1});
    if ((i + d - 2) % 2 === 1) out.push({key: `b${i}`, type: 'X', cx: i + 0.5, cy: d - 1 + 0.25, kind: 'bottom', i, j: d - 1});
  }
  for (let j = 0; j < d - 1; j++) {
    if (j % 2 === 0) out.push({key: `l${j}`, type: 'Z', cx: -0.25, cy: j + 0.5, kind: 'left', i: -1, j});
    if ((d - 2 + j) % 2 === 0) out.push({key: `r${j}`, type: 'Z', cx: d - 1 + 0.25, cy: j + 0.5, kind: 'right', i: d - 1, j});
  }
  return out;
};

export const plaqPath = (p: Plaq, s: number, ox: number, oy: number, k = 1) => {
  const X = (gx: number) => ox + gx * s;
  const Y = (gy: number) => oy + gy * s;
  const cx = X(p.cx);
  const cy = Y(p.cy);
  const sc = (x: number, y: number) => `${cx + (x - cx) * k},${cy + (y - cy) * k}`;
  if (p.kind === 'square') {
    const x0 = X(p.i);
    const y0 = Y(p.j);
    return `M${sc(x0, y0)}L${sc(x0 + s, y0)}L${sc(x0 + s, y0 + s)}L${sc(x0, y0 + s)}Z`;
  }
  const r = s / 2;
  if (p.kind === 'top') {
    const x0 = X(p.i);
    const y0 = Y(0);
    return `M${sc(x0, y0)}A${r * k},${r * k} 0 0 1 ${sc(x0 + s, y0)}Z`;
  }
  if (p.kind === 'bottom') {
    const x0 = X(p.i);
    const y0 = Y(p.j);
    return `M${sc(x0 + s, y0)}A${r * k},${r * k} 0 0 1 ${sc(x0, y0)}Z`;
  }
  if (p.kind === 'left') {
    const x0 = X(0);
    const y0 = Y(p.j);
    return `M${sc(x0, y0 + s)}A${r * k},${r * k} 0 0 1 ${sc(x0, y0)}Z`;
  }
  const x0 = X(p.i);
  const y0 = Y(p.j);
  return `M${sc(x0, y0)}A${r * k},${r * k} 0 0 1 ${sc(x0, y0 + s)}Z`;
};

/** 静态小尺寸表面码（用于码距对比） */
export const MiniLattice: React.FC<{d: number; s: number; cx: number; cy: number; appear: number; glow?: number}> = ({
  d,
  s,
  cx,
  cy,
  appear,
  glow = 0,
}) => {
  const plaqs = buildLattice(d);
  const ox = cx - ((d - 1) * s) / 2;
  const oy = cy - ((d - 1) * s) / 2;
  return (
    <g opacity={appear} transform={`translate(${cx} ${cy}) scale(${0.4 + 0.6 * appear}) translate(${-cx} ${-cy})`}>
      {plaqs.map((p) => {
        const col = p.type === 'X' ? C.cyan : C.magenta;
        return <path key={p.key} d={plaqPath(p, s, ox, oy, 0.94)} fill={alpha(col, 0.28 + glow * 0.2)} stroke={alpha(col, 0.9)} strokeWidth={1.5} />;
      })}
      {new Array(d * d).fill(0).map((_, n) => {
        const i = n % d;
        const j = Math.floor(n / d);
        return <circle key={n} cx={ox + i * s} cy={oy + j * s} r={s * 0.17} fill={C.white} style={{filter: `drop-shadow(0 0 4px ${C.white})`}} />;
      })}
    </g>
  );
};
