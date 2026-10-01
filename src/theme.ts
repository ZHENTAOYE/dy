import {interpolateColors} from 'remotion';

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  bg: '#02030a',
  ink: '#070a1c',
  cyan: '#00e5ff',
  blue: '#3d7bff',
  violet: '#8b5cff',
  magenta: '#ff2bd6',
  red: '#ff2f4f',
  orange: '#ff8a1f',
  gold: '#ffd23f',
  green: '#2dff9b',
  white: '#f2f6ff',
  dim: '#8590b8',
};

export const FONT = {
  cn: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Zen Hei', sans-serif",
  tech: "'Orbitron', 'Noto Sans SC', sans-serif",
  math: "'Noto Sans Math', 'Noto Sans SC', serif",
};

/** 给任意颜色（#rrggbb / rgb() / rgba()）设置透明度 */
export const alpha = (c: string, a: number): string => {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((s) => parseFloat(s));
    return `rgba(${r},${g},${b},${a})`;
  }
  return c;
};

export const mix = (a: string, b: string, t: number): string =>
  interpolateColors(Math.min(1, Math.max(0, t)), [0, 1], [a, b]);
