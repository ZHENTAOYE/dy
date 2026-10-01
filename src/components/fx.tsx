import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {CLAMP, easeOut} from '../lib/anim';
import {alpha, C, H, W} from '../theme';

/** 覆盖全屏的 SVG 画布 */
export const Canvas: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{position: 'absolute', inset: 0, overflow: 'visible', ...style}}
  >
    {children}
  </svg>
);

/** 三层描边伪发光（比 blur 滤镜便宜得多） */
export const GlowPath: React.FC<{
  d: string;
  color: string;
  width?: number;
  opacity?: number;
  dash?: string;
  core?: string;
}> = ({d, color, width = 4, opacity = 1, dash, core = C.white}) => (
  <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={alpha(color, 0.12)} strokeWidth={width * 6} strokeDasharray={dash} />
    <path d={d} stroke={alpha(color, 0.45)} strokeWidth={width * 2.4} strokeDasharray={dash} />
    <path d={d} stroke={color} strokeWidth={width} strokeDasharray={dash} />
    <path d={d} stroke={core} strokeWidth={Math.max(1, width * 0.35)} strokeDasharray={dash} opacity={0.8} />
  </g>
);

/** 发光能量球 */
export const Orb: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  id: string;
  intensity?: number;
  halo?: number;
}> = ({x, y, r, color, id, intensity = 1, halo = 3}) => (
  <g>
    <defs>
      <radialGradient id={`${id}-halo`}>
        <stop offset="0%" stopColor={color} stopOpacity={0.55 * intensity} />
        <stop offset="35%" stopColor={color} stopOpacity={0.16 * intensity} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </radialGradient>
      <radialGradient id={`${id}-core`} cx="42%" cy="38%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor={alpha('#ffffff', 0.95)} />
        <stop offset="62%" stopColor={color} />
        <stop offset="100%" stopColor={alpha(color, 0.15)} />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r * halo} fill={`url(#${id}-halo)`} />
    <circle cx={x} cy={y} r={r} fill={`url(#${id}-core)`} />
  </g>
);

const boltPoints = (x1: number, y1: number, x2: number, y2: number, seed: string, depth = 6, disp = 0.2) => {
  let pts: [number, number][] = [
    [x1, y1],
    [x2, y2],
  ];
  let amp = Math.hypot(x2 - x1, y2 - y1) * disp;
  for (let d = 0; d < depth; d++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const nx = -(by - ay);
      const ny = bx - ax;
      const nl = Math.hypot(nx, ny) || 1;
      const off = (random(`${seed}-${d}-${i}`) - 0.5) * 2 * amp;
      next.push([(ax + bx) / 2 + (nx / nl) * off, (ay + by) / 2 + (ny / nl) * off], pts[i + 1]);
    }
    pts = next;
    amp *= 0.52;
  }
  return pts;
};

const toD = (pts: [number, number][]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');

/** 闪电：start 帧开始劈下，len 帧内到达，之后持续 hold 帧闪烁 */
export const Lightning: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  start: number;
  seed: string;
  color?: string;
  width?: number;
  len?: number;
  hold?: number;
  branches?: number;
}> = ({x1, y1, x2, y2, start, seed, color = C.cyan, width = 5, len = 4, hold = 10, branches = 3}) => {
  const f = useCurrentFrame();
  const t = f - start;
  if (t < 0 || t > len + hold) return null;
  const s = `${seed}${Math.floor(f / 2)}`;
  const pts = boltPoints(x1, y1, x2, y2, s);
  const shown = Math.max(2, Math.floor(interpolate(t, [0, len], [2, pts.length], CLAMP)));
  const fade = interpolate(t, [len, len + hold], [1, 0], CLAMP);
  const flick = random(`${s}fl`) > 0.25 ? 1 : 0.35;
  const br: [number, number][][] = [];
  for (let b = 0; b < branches; b++) {
    const idx = Math.floor((0.2 + random(`${seed}b${b}`) * 0.6) * pts.length);
    if (idx >= shown) continue;
    const [bx, by] = pts[idx];
    const ang = Math.atan2(y2 - y1, x2 - x1) + (random(`${seed}ba${b}`) - 0.5) * 2.2;
    const L = Math.hypot(x2 - x1, y2 - y1) * (0.15 + random(`${seed}bl${b}`) * 0.2);
    br.push(boltPoints(bx, by, bx + Math.cos(ang) * L, by + Math.sin(ang) * L, `${s}br${b}`, 4));
  }
  return (
    <g opacity={fade * flick}>
      <GlowPath d={toD(pts.slice(0, shown))} color={color} width={width} />
      {br.map((b, i) => (
        <GlowPath key={i} d={toD(b)} color={color} width={width * 0.5} />
      ))}
    </g>
  );
};

/** 冲击波圆环 */
export const Shockwave: React.FC<{
  x: number;
  y: number;
  start: number;
  color?: string;
  maxR?: number;
  dur?: number;
  width?: number;
  rings?: number;
}> = ({x, y, start, color = C.cyan, maxR = 600, dur = 26, width = 14, rings = 3}) => {
  const f = useCurrentFrame();
  return (
    <g fill="none">
      {new Array(rings).fill(0).map((_, i) => {
        const t = (f - start - i * 4) / dur;
        if (t < 0 || t > 1) return null;
        const e = easeOut(t);
        const r = 10 + e * maxR * (1 - i * 0.18);
        return (
          <g key={i} opacity={(1 - t) * (1 - i * 0.25)}>
            <circle cx={x} cy={y} r={r} stroke={alpha(color, 0.25)} strokeWidth={width * 3 * (1 - t)} />
            <circle cx={x} cy={y} r={r} stroke={color} strokeWidth={width * (1 - t) + 1} />
          </g>
        );
      })}
    </g>
  );
};

/** 粒子爆发（带拖尾的流星线条） */
export const Burst: React.FC<{
  x: number;
  y: number;
  start: number;
  seed: string;
  count?: number;
  colors?: string[];
  speed?: number;
  life?: number;
  width?: number;
}> = ({x, y, start, seed, count = 50, colors = [C.cyan, C.white, C.magenta], speed = 34, life = 40, width = 4}) => {
  const f = useCurrentFrame();
  const t = f - start;
  if (t < 0 || t > life) return null;
  const tau = life / 3.2;
  const pos = (v: number, tt: number) => v * tau * (1 - Math.exp(-tt / tau));
  return (
    <g strokeLinecap="round">
      {new Array(count).fill(0).map((_, i) => {
        const ang = random(`${seed}a${i}`) * Math.PI * 2;
        const v = speed * (0.3 + random(`${seed}v${i}`) * 0.9);
        const col = colors[i % colors.length];
        const d1 = pos(v, t);
        const d0 = pos(v, Math.max(0, t - 2.5));
        const o = (1 - t / life) * (0.6 + random(`${seed}o${i}`) * 0.4);
        const wv = width * (0.5 + random(`${seed}w${i}`));
        return (
          <g key={i} opacity={o}>
            <line
              x1={x + Math.cos(ang) * d0}
              y1={y + Math.sin(ang) * d0}
              x2={x + Math.cos(ang) * d1}
              y2={y + Math.sin(ang) * d1}
              stroke={alpha(col, 0.35)}
              strokeWidth={wv * 3}
            />
            <line
              x1={x + Math.cos(ang) * d0}
              y1={y + Math.sin(ang) * d0}
              x2={x + Math.cos(ang) * d1}
              y2={y + Math.sin(ang) * d1}
              stroke={col}
              strokeWidth={wv}
            />
          </g>
        );
      })}
    </g>
  );
};

/** 旋转光芒（冲击时的“神光”背景） */
export const GodRays: React.FC<{opacity: number; color?: string; x?: string; y?: string; speed?: number}> = ({
  opacity,
  color = C.cyan,
  x = '50%',
  y = '45%',
  speed = 0.4,
}) => {
  const f = useCurrentFrame();
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: `repeating-conic-gradient(from ${f * speed}deg at ${x} ${y}, ${alpha(color, 0.16)} 0deg 3deg, transparent 3deg 14deg)`,
        WebkitMaskImage: `radial-gradient(circle at ${x} ${y}, black 0%, rgba(0,0,0,0.5) 30%, transparent 62%)`,
        maskImage: `radial-gradient(circle at ${x} ${y}, black 0%, rgba(0,0,0,0.5) 30%, transparent 62%)`,
      }}
    />
  );
};

/** 故障条纹叠层 */
export const GlitchBars: React.FC<{intensity: number; seed?: string}> = ({intensity, seed = 'gb'}) => {
  const f = useCurrentFrame();
  if (intensity < 0.02) return null;
  const n = Math.floor(4 + intensity * 14);
  const cols = [C.cyan, C.magenta, C.white, C.red];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(n).fill(0).map((_, i) => {
        const y = random(`${seed}${f}y${i}`) * H;
        const h = 2 + random(`${seed}${f}h${i}`) ** 2 * 60 * intensity;
        const x = (random(`${seed}${f}x${i}`) - 0.3) * W;
        const w = W * (0.2 + random(`${seed}${f}w${i}`) * 0.9);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              background: cols[i % cols.length],
              opacity: 0.12 + random(`${seed}${f}o${i}`) * 0.35 * intensity,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** 全屏闪白 */
export const Flash: React.FC<{opacity: number; color?: string}> = ({opacity, color = '#ffffff'}) =>
  opacity > 0.001 ? <AbsoluteFill style={{background: color, opacity, mixBlendMode: 'screen'}} /> : null;
