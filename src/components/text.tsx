import React from 'react';
import {interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CLAMP} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

/** RGB 分离 + 切片错位的故障文字 */
export const GlitchText: React.FC<{
  text: string;
  intensity: number;
  seed?: string;
  style?: React.CSSProperties;
  color?: string;
  glow?: string;
}> = ({text, intensity, seed = 'g', style, color = C.white, glow}) => {
  const f = useCurrentFrame();
  const r = (k: string) => random(`${seed}${k}${f}`) - 0.5;
  const on = intensity > 0.02;
  const dx = on ? r('dx') * 70 * intensity : 0;
  const dy = on ? r('dy') * 16 * intensity : 0;
  const st = random(`${seed}st${f}`) * 80;
  const sh = 6 + random(`${seed}sh${f}`) * 26;
  const slice = on && random(`${seed}c${f}`) < intensity;
  const shadow = glow ? `0 0 30px ${alpha(glow, 0.9)}, 0 0 80px ${alpha(glow, 0.5)}` : undefined;
  return (
    <div style={{position: 'relative', whiteSpace: 'nowrap', ...style}}>
      {on && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              color: C.cyan,
              transform: `translate(${-dx}px, ${dy}px)`,
              mixBlendMode: 'screen',
              opacity: 0.9,
            }}
          >
            {text}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              color: C.magenta,
              transform: `translate(${dx}px, ${-dy}px)`,
              mixBlendMode: 'screen',
              opacity: 0.9,
            }}
          >
            {text}
          </div>
        </>
      )}
      <div style={{position: 'relative', color, textShadow: shadow}}>{text}</div>
      {slice && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            color,
            clipPath: `inset(${st}% 0 ${Math.max(0, 100 - st - sh)}% 0)`,
            transform: `translateX(${r('ss') * 140 * intensity}px)`,
            textShadow: shadow,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

type Tok = {ch: string; hl: boolean};

const parse = (s: string): Tok[] => {
  const out: Tok[] = [];
  s.split('**').forEach((p, i) => {
    for (const ch of Array.from(p)) out.push({ch, hl: i % 2 === 1});
  });
  return out;
};

export type Cap = {at: number; to: number; text: string; color?: string};

/** 抖音风格大字幕：逐字弹出，**高亮** 关键词 */
export const Captions: React.FC<{items: Cap[]; top?: number; size?: number; hl?: string}> = ({
  items,
  top = 1350,
  size = 64,
  hl = C.gold,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cur = items.find((c) => f >= c.at && f < c.to);
  if (!cur) return null;
  const lines = cur.text.split('\n').map(parse);
  const out = interpolate(f, [cur.to - 6, cur.to], [1, 0], CLAMP);
  // 排版：可用 \n 手动断行；单行 ≤15 字用默认字号，16~18 字缩小保持单行，更长则自动均分两行
  const longest = Math.max(...lines.map((l) => l.length));
  const fs = longest <= 15 ? size : longest <= 18 ? Math.floor(950 / longest) - 2 : Math.min(size - 4, 60);
  const perLine = longest <= 18 ? longest : Math.ceil(longest / 2);
  const maxW = Math.min(980, perLine * (fs + 2) + 8);
  const rows = lines.length + (longest > 18 ? 1 : 0);
  const col = cur.color ?? hl;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        display: 'flex',
        justifyContent: 'center',
        opacity: out,
        transform: `translateY(${(1 - out) * -24}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -40,
          height: fs * (2 + rows * 1.4),
          background: 'linear-gradient(180deg, transparent, rgba(2,3,10,0.55) 30%, rgba(2,3,10,0.55) 70%, transparent)',
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: maxW,
          textAlign: 'center',
          fontFamily: FONT.cn,
          fontWeight: 900,
          fontSize: fs,
          lineHeight: 1.4,
          letterSpacing: 2,
        }}
      >
        {lines.map((toks, li) => (
          <div key={li}>
            {toks.map((t, ci) => {
              const i = lines.slice(0, li).reduce((n, l) => n + l.length, 0) + ci;
              const s = spring({frame: f - cur.at - i * 0.9, fps, config: {damping: 13, stiffness: 230, mass: 0.55}});
              return (
                <span
                  key={ci}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    opacity: Math.min(1, s * 1.6),
                    transform: `translateY(${(1 - s) * 46}px) scale(${0.5 + 0.5 * Math.min(1.2, s)})`,
                    color: t.hl ? col : C.white,
                    fontFamily: /[α-ωψ⟩|]/.test(t.ch) ? FONT.math : undefined,
                    textShadow: t.hl
                      ? `0 0 22px ${alpha(col, 0.85)}, 0 0 50px ${alpha(col, 0.4)}, 0 5px 0 rgba(0,0,0,0.7)`
                      : '0 5px 0 rgba(0,0,0,0.7), 0 0 22px rgba(0,0,0,0.9)',
                  }}
                >
                  {t.ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/** 左上角章节标签 */
export const ChapterTag: React.FC<{n: string; title: string; en: string; color?: string}> = ({
  n,
  title,
  en,
  color = C.cyan,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 2, fps, config: {damping: 16, stiffness: 120}});
  const line = interpolate(f, [6, 26], [0, 1], CLAMP);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        top: 190,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        opacity: s,
        transform: `translateX(${(1 - s) * -80}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.cn,
          fontWeight: 900,
          fontSize: 88,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `2px ${color}`,
          textShadow: `0 0 26px ${alpha(color, 0.7)}`,
        }}
      >
        {n}
      </div>
      <div style={{width: 4, height: 84 * line, background: color, boxShadow: `0 0 16px ${color}`}} />
      <div>
        <div style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 46, color: C.white, lineHeight: 1.1}}>{title}</div>
        <div
          style={{
            fontFamily: FONT.tech,
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: 6,
            color: alpha(color, 0.9),
            marginTop: 8,
            clipPath: `inset(0 ${(1 - line) * 100}% 0 0)`,
          }}
        >
          {en}
        </div>
      </div>
    </div>
  );
};

/** 科学计数法：10^-3 */
export const Pow: React.FC<{base?: string; exp: string}> = ({base = '10', exp}) => (
  <span>
    {base}
    <sup style={{fontSize: '0.6em', verticalAlign: '0.75em', marginLeft: 2}}>{exp}</sup>
  </span>
);
