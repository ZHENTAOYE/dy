import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {LATIN, MONO, SANS, SERIF} from '../fonts';
import {clamp} from '../lib/math';

export type Pos = 'top' | 'upper' | 'center' | 'lower' | 'bottom' | number;

// Vertical anchor for text blocks. Portrait keeps clear of the short-video UI at the bottom.
export const useLayout = () => {
  const {width, height} = useVideoConfig();
  const portrait = height > width;
  const S = Math.min(width, height);
  const y = (p: Pos) => {
    if (typeof p === 'number') return p * height;
    const table = portrait
      ? {top: 0.15, upper: 0.27, center: 0.5, lower: 0.66, bottom: 0.75}
      : {top: 0.13, upper: 0.24, center: 0.5, lower: 0.74, bottom: 0.86};
    return table[p] * height;
  };
  return {width, height, portrait, S, y};
};

const GOLD = '#ffd9a0';

// Split "text {highlight} text" into styled runs.
const parse = (s: string) => {
  const out: {t: string; hi: boolean}[] = [];
  const re = /\{([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({t: s.slice(last, m.index), hi: false});
    out.push({t: m[1], hi: true});
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({t: s.slice(last), hi: false});
  return out;
};

type LineProps = {
  text: string;
  dur: number;
  pos?: Pos;
  size?: number; // relative to min(width, height)
  font?: 'serif' | 'sans';
  weight?: number;
  color?: string;
  stagger?: number;
  fadeOut?: number;
  align?: 'center' | 'left';
  x?: number;
  delay?: number;
  hiColor?: string;
};

// A line of narration: characters rise out of a blur one by one, then dissolve.
export const Line: React.FC<LineProps> = ({
  text,
  dur,
  pos = 'lower',
  size = 0.05,
  font = 'sans',
  weight = 400,
  color = '#f2f5ff',
  stagger = 1.4,
  fadeOut = 14,
  align = 'center',
  x,
  delay = 0,
  hiColor = GOLD,
}) => {
  const f = useCurrentFrame() - delay;
  const {width, S, y} = useLayout();
  const fs = size * S;
  const runs = parse(text);
  const out = clamp((dur - f) / fadeOut);
  let idx = 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: align === 'center' ? 0 : (x ?? 0.08) * width,
          width: align === 'center' ? width : undefined,
          top: y(pos),
          transform: 'translateY(-50%)',
          textAlign: align,
          fontFamily: font === 'serif' ? SERIF : SANS,
          fontWeight: weight,
          fontSize: fs,
          color,
          letterSpacing: '0.08em',
          lineHeight: 1.4,
          opacity: out,
          filter: out < 1 ? `blur(${(1 - out) * 10}px)` : undefined,
          textShadow: `0 0 ${fs * 0.5}px rgba(120,160,255,0.3), 0 0 ${fs * 0.25}px rgba(0,0,0,0.75), 0 2px ${fs * 0.12}px rgba(0,0,0,0.9)`,
          whiteSpace: 'pre',
          padding: `0 ${0.06 * width}px`,
          boxSizing: 'border-box',
        }}
      >
        {runs.map((r, ri) => (
          <span
            key={ri}
            style={
              r.hi
                ? {
                    color: hiColor,
                    fontFamily: /[0-9]/.test(r.t) ? LATIN : undefined,
                    fontWeight: /[0-9]/.test(r.t) ? 300 : 700,
                    fontSize: '1.25em',
                    textShadow: `0 0 ${fs * 0.6}px rgba(255,190,110,0.6)`,
                  }
                : undefined
            }
          >
            {Array.from(r.t).map((ch, ci) => {
              const i = idx++;
              const t = clamp((f - i * stagger) / 12);
              const e = Easing.out(Easing.cubic)(t);
              return (
                <span
                  key={ci}
                  style={{
                    display: 'inline-block',
                    opacity: e,
                    transform: `translateY(${(1 - e) * fs * 0.45}px)`,
                    filter: e < 1 ? `blur(${(1 - e) * 8}px)` : undefined,
                    whiteSpace: 'pre',
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

type TitleProps = {
  title: string;
  en?: string;
  kicker?: string;
  dur: number;
  pos?: Pos;
  size?: number;
  delay?: number;
};

// Chapter title: giant serif characters punch in from a glow, with an English subtitle.
export const Title: React.FC<TitleProps> = ({title, en, kicker, dur, pos = 'upper', size = 0.2, delay = 0}) => {
  const f = useCurrentFrame() - delay;
  const {width, S, y} = useLayout();
  const fs = size * S;
  const chars = Array.from(title);
  const out = clamp((dur - f) / 18);
  const sweep = interpolate(f, [6, 50], [-60, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lineW = interpolate(f, [4, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: out, filter: out < 1 ? `blur(${(1 - out) * 14}px)` : undefined}}>
      <div style={{position: 'absolute', top: y(pos), left: 0, width, transform: 'translateY(-50%)', textAlign: 'center'}}>
        {kicker ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: fs * 0.16,
              letterSpacing: '0.6em',
              color: 'rgba(220,230,255,0.8)',
              marginBottom: fs * 0.12,
              opacity: clamp(f / 15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: fs * 0.15,
            }}
          >
            <span style={{height: 1, width: fs * 0.8 * lineW, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8))'}} />
            <span style={{paddingLeft: '0.6em'}}>{kicker}</span>
            <span style={{height: 1, width: fs * 0.8 * lineW, background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.8))'}} />
          </div>
        ) : null}
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: fs,
            lineHeight: 1.1,
            letterSpacing: '0.12em',
            paddingLeft: '0.12em',
            filter: `drop-shadow(0 0 ${fs * 0.05}px rgba(0,0,20,${0.55 * clamp(f / 20)})) drop-shadow(0 0 ${fs * 0.12}px rgba(150,180,255,${0.7 * clamp(f / 20)})) drop-shadow(0 0 ${fs * 0.35}px rgba(110,140,255,${0.4 * clamp(f / 20)}))`,
          }}
        >
          {chars.map((ch, i) => {
            const t = clamp((f - i * 4) / 16);
            const e = Easing.out(Easing.exp)(t);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: e,
                  transform: `scale(${1 + (1 - e) * 0.6})`,
                  filter: e < 1 ? `blur(${(1 - e) * 24}px)` : undefined,
                  backgroundImage: `linear-gradient(100deg, #fff 0%, #e8eeff ${sweep - 20}%, #ffffff ${sweep}%, #ffe2b8 ${sweep + 12}%, #dfe6ff ${sweep + 30}%, #c9d4ff 100%)`,
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textShadow: 'none',
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        {en ? (
          <div
            style={{
              fontFamily: LATIN,
              fontWeight: 300,
              fontSize: fs * 0.15,
              letterSpacing: interpolate(f, [8, 50], [1.4, 0.7], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) + 'em',
              color: 'rgba(230,236,255,0.85)',
              marginTop: fs * 0.1,
              opacity: clamp((f - 8) / 20),
              paddingLeft: '0.7em',
            }}
          >
            {en}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

type StatProps = {
  value: number;
  from?: number;
  label?: string;
  unit?: string;
  dur: number;
  pos?: Pos;
  size?: number;
  countFrames?: number;
  format?: (v: number) => string;
};

// Large counting number for the moments that need sheer magnitude.
export const Stat: React.FC<StatProps> = ({value, from = 0, label, unit, dur, pos = 'lower', size = 0.16, countFrames = 50, format}) => {
  const f = useCurrentFrame();
  const {width, S, y} = useLayout();
  const fs = size * S;
  const t = Easing.out(Easing.exp)(clamp(f / countFrames));
  const v = from + (value - from) * t;
  const txt = format ? format(v) : Math.round(v).toLocaleString('en-US');
  const out = clamp((dur - f) / 14);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: out * clamp(f / 8)}}>
      <div style={{position: 'absolute', top: y(pos), width, transform: 'translateY(-50%)', textAlign: 'center'}}>
        {label ? (
          <div style={{fontFamily: SANS, fontWeight: 400, fontSize: fs * 0.28, color: '#dfe6ff', letterSpacing: '0.15em', marginBottom: fs * 0.05}}>
            {label}
          </div>
        ) : null}
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: fs * 0.12}}>
          <span
            style={{
              fontFamily: LATIN,
              fontWeight: 200,
              fontSize: fs,
              color: GOLD,
              letterSpacing: '0.02em',
              textShadow: `0 0 ${fs * 0.3}px rgba(255,180,90,0.7), 0 0 ${fs * 0.8}px rgba(255,140,60,0.35)`,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {txt}
          </span>
          {unit ? <span style={{fontFamily: SERIF, fontWeight: 700, fontSize: fs * 0.32, color: '#fff'}}>{unit}</span> : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Small monospace annotation used for labels and readouts.
export const Mono: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 0.022, color = 'rgba(210,225,255,0.9)', style}) => {
  const {S} = useLayout();
  return (
    <span style={{fontFamily: MONO, fontSize: size * S, color, letterSpacing: '0.08em', whiteSpace: 'nowrap', ...style}}>{children}</span>
  );
};

export const Label: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; weight?: number}> = ({children, size = 0.03, color = '#e9eeff', style, weight = 400}) => {
  const {S} = useLayout();
  return (
    <span
      style={{
        fontFamily: SANS,
        fontWeight: weight,
        fontSize: size * S,
        color,
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        textShadow: '0 0 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)',
        ...style,
      }}
    >
      {children}
    </span>
  );
};
