import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Canvas, Flash, GlitchBars, GlowPath, Orb, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag, GlitchText} from '../components/text';
import {CLAMP, easeOut, impulse, pop, prog, vnoise} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

const NO = 4;
const CARDS = [44, 118, 192];
const DOOM = 268;
const CARD_Y = [360, 660, 960];

/** 图标 1：不可克隆 */
const IconClone: React.FC<{t: number}> = ({t}) => {
  const arrow = prog(t, 6, 18, easeOut);
  const ghost = prog(t, 14, 24);
  const x1 = prog(t, 24, 32, easeOut);
  const x2 = prog(t, 30, 38, easeOut);
  return (
    <g>
      <Orb id="ic1" x={52} y={110} r={30} color={C.cyan} halo={2.6} />
      <GlowPath d={`M92,110L${92 + 40 * arrow},110`} color={C.white} width={3} />
      {arrow > 0.9 && <path d="M132,98L148,110L132,122Z" fill={C.white} />}
      <circle cx={180} cy={110} r={30} fill="none" stroke={alpha(C.cyan, 0.8)} strokeWidth={3} strokeDasharray="7 6" opacity={ghost} />
      <GlowPath d={`M150,80L${150 + 60 * x1},${80 + 60 * x1}`} color={C.red} width={7} />
      <GlowPath d={`M210,80L${210 - 60 * x2},${80 + 60 * x2}`} color={C.red} width={7} />
    </g>
  );
};

/** 图标 2：测量即坍缩 */
const IconCollapse: React.FC<{t: number}> = ({t}) => {
  const eye = prog(t, 4, 14, easeOut);
  const col = prog(t, 22, 32);
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = 20 + (i / 60) * 180;
    const u = (x - 110) / 90;
    const env = Math.exp(-(u * u) / (2 * (0.55 - 0.5 * col) ** 2 + 1e-4));
    const amp = 38 * (1 - col) * Math.sin(u * 10 + t * 0.4) * env + 70 * col * Math.exp(-(u * u) / 0.004);
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)},${(160 - Math.abs(amp)).toFixed(1)}`);
  }
  return (
    <g>
      <g opacity={eye} transform={`translate(110 52) scale(${eye})`}>
        <path d="M-56,0Q0,-38 56,0Q0,38 -56,0Z" fill={alpha(C.gold, 0.12)} stroke={C.gold} strokeWidth={4} />
        <circle r={15} fill={C.gold} />
        <circle r={6} fill={C.bg} />
      </g>
      <line x1={20} x2={200} y1={160} y2={160} stroke={alpha(C.white, 0.3)} strokeWidth={2} />
      <GlowPath d={pts.join('')} color={col > 0.5 ? C.red : C.violet} width={3.5} />
    </g>
  );
};

/** 图标 3：错误是连续的 */
const IconDial: React.FC<{t: number; f: number}> = ({t, f}) => {
  const vis = prog(t, 4, 14, easeOut);
  const ang = -90 + 26 * vnoise('dial', f * 0.18) + 8 * Math.sin(f * 0.7);
  const a = (ang * Math.PI) / 180;
  return (
    <g opacity={vis}>
      <path d="M30,150A80,80 0 0 1 190,150" fill="none" stroke={alpha(C.white, 0.35)} strokeWidth={4} />
      {new Array(19).fill(0).map((_, i) => {
        const ta = Math.PI + (i / 18) * Math.PI;
        return (
          <line
            key={i}
            x1={110 + Math.cos(ta) * 80}
            y1={150 + Math.sin(ta) * 80}
            x2={110 + Math.cos(ta) * (i % 3 ? 70 : 62)}
            y2={150 + Math.sin(ta) * (i % 3 ? 70 : 62)}
            stroke={alpha(C.white, 0.6)}
            strokeWidth={2}
          />
        );
      })}
      <GlowPath d={`M110,150L${110 + Math.cos(a) * 74},${150 + Math.sin(a) * 74}`} color={C.orange} width={5} />
      <circle cx={110} cy={150} r={9} fill={C.orange} />
      <text x={110} y={198} textAnchor="middle" fontFamily={FONT.tech} fontSize={22} fill={C.orange} fontWeight={700}>
        {`θ = ${(ang + 90).toFixed(2)}°`}
      </text>
    </g>
  );
};

const INFO = [
  {n: '01', t: '不可克隆', s: '未知的量子态，无法被复制', c: C.red},
  {n: '02', t: '测量即坍缩', s: '一看它，叠加态就被破坏', c: C.orange},
  {n: '03', t: '错误是连续的', s: '不只是翻转，还有无穷多种微小偏差', c: C.magenta},
];

export const S5Walls: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const noS = pop(f, fps, NO, {damping: 9, stiffness: 260});
  const noOut = interpolate(f, [30, 42], [1, 0], CLAMP);
  const doom = prog(f, DOOM, DOOM + 12);
  const hits = [NO + 2, ...CARDS.map((c) => c + 6), DOOM];

  return (
    <SceneShell hits={hits} amp={28}>
      <ChapterTag n="04" title="三道难关" en="THREE WALLS" color={C.orange} />

      {noOut > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 660,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            opacity: noOut * Math.min(1, noS * 2),
            transform: `scale(${(3 - 2 * noS) * (1 + (1 - noOut) * 0.3)})`,
          }}
        >
          <GlitchText
            text="没那么简单！"
            intensity={0.2 + impulse(f, [NO + 2], 5)}
            seed="no"
            color={C.white}
            glow={C.red}
            style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 140}}
          />
        </div>
      )}

      {INFO.map((info, i) => {
        const at = CARDS[i];
        const t = f - at;
        if (t < 0) return null;
        const s = pop(f, fps, at, {damping: 13, stiffness: 170});
        const flash = impulse(f, [at + 6], 6);
        const jitter = doom > 0 ? (random(`dj${i}${f}`) - 0.5) * 10 * doom : 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 70,
              top: CARD_Y[i],
              width: 940,
              height: 260,
              borderRadius: 30,
              background: `linear-gradient(110deg, ${alpha(info.c, 0.18 + flash * 0.3)}, rgba(8,10,26,0.85) 45%)`,
              border: `3px solid ${alpha(info.c, 0.9)}`,
              boxShadow: `0 0 ${40 + flash * 60}px ${alpha(info.c, 0.45 + flash * 0.4)}, inset 0 0 50px ${alpha(info.c, 0.15)}`,
              transform: `translateX(${(1 - s) * 1100 + jitter}px) skewX(${(1 - s) * -14}deg)`,
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              filter: doom > 0 ? `saturate(${1 - doom * 0.4}) brightness(${1 - doom * 0.25})` : undefined,
            }}
          >
            <svg width={240} height={240} viewBox="0 0 220 220" style={{flexShrink: 0, marginLeft: 16}}>
              {i === 0 && <IconClone t={t} />}
              {i === 1 && <IconCollapse t={t} />}
              {i === 2 && <IconDial t={t} f={f} />}
            </svg>
            <div style={{marginLeft: 22}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
                <span style={{fontFamily: FONT.tech, fontWeight: 900, fontSize: 40, color: info.c, textShadow: `0 0 16px ${info.c}`}}>
                  {info.n}
                </span>
                <span style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 64, color: C.white}}>{info.t}</span>
              </div>
              <div style={{fontFamily: FONT.cn, fontWeight: 500, fontSize: 33, color: alpha(C.white, 0.82), marginTop: 10, width: 600}}>
                {info.s}
              </div>
            </div>
            {/* 扫光 */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 160,
                left: interpolate(t, [4, 22], [-200, 1100], CLAMP),
                background: `linear-gradient(90deg, transparent, ${alpha('#ffffff', 0.25)}, transparent)`,
                transform: 'skewX(-20deg)',
              }}
            />
          </div>
        );
      })}

      <Canvas>
        {CARDS.map((c, i) => (
          <Shockwave key={i} x={540} y={CARD_Y[i] + 130} start={c + 6} color={INFO[i].c} maxR={650} width={10} rings={2} />
        ))}
      </Canvas>

      {doom > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 50%, transparent 30%, ${alpha(C.red, 0.35 * doom)} 100%)`,
          }}
        />
      )}

      <Captions
        items={[
          {at: 8, to: CARDS[0], text: '量子世界，有**三道难关**', color: C.red},
          {at: CARDS[0] + 2, to: CARDS[1], text: '① 未知的量子态，**无法复制**', color: C.red},
          {at: CARDS[1] + 2, to: CARDS[2], text: '② 一测量，叠加态就**坍缩**', color: C.orange},
          {at: CARDS[2] + 2, to: DOOM, text: '③ 错误是**连续**的，有无穷多种', color: C.magenta},
          {at: DOOM + 2, to: 328, text: '这……还怎么**纠错**？', color: C.red},
        ]}
      />
      <GlitchBars intensity={Math.max(impulse(f, hits, 4) * 0.7, doom * (random(`dg${f}`) > 0.6 ? 0.5 : 0))} seed="w5" />
      <Flash opacity={impulse(f, [NO + 2], 4) * 0.5} color={C.red} />
    </SceneShell>
  );
};
