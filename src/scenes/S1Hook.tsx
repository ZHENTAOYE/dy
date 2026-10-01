import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Burst, Canvas, Flash, GlitchBars, GodRays, Lightning, Orb, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, GlitchText} from '../components/text';
import {CLAMP, easeOut, impulse, pop, prog} from '../lib/anim';
import {alpha, C, FONT, mix} from '../theme';

const HIT = 72;
const SHATTER = 132;
const TITLE = 142;
const CX = 540;
const CY = 820;

const ZAPS = [80, 90, 97, 106, 112, 119, 124, 128];

/** 开场：量子比特 → 被噪声击碎 → 标题“量子纠错”重磅砸出 */
export const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const orbIn = pop(f, fps, 2, {damping: 9, stiffness: 120});
  const danger = interpolate(f, [HIT, HIT + 4], [0, 1], CLAMP);
  const flick = f >= HIT && f < SHATTER && random(`fl${f}`) > 0.7 ? 0.35 : 1;
  const alive = f < SHATTER;
  const breathe = 1 + 0.05 * Math.sin(f * 0.22);
  const col = mix(C.cyan, C.red, danger);
  const glitch = f >= HIT && f < SHATTER ? 0.25 + 0.75 * impulse(f, ZAPS.concat(HIT), 3) : 0;

  // 标题
  const tS = pop(f, fps, TITLE, {damping: 12, stiffness: 260, mass: 0.9});
  const tScale = 3.2 - 2.2 * tS;
  const titleGlitch = f >= TITLE ? Math.max(impulse(f, [TITLE + 2], 5), random(`tg${Math.floor(f / 3)}`) > 0.93 ? 0.6 : 0) : 0;
  const sub = interpolate(f, [TITLE + 14, TITLE + 34], [0, 1], CLAMP);
  const tag = pop(f, fps, TITLE + 30);
  const hex = prog(f, TITLE, TITLE + 30, easeOut);

  const orbitR = 230;
  const rings = [0, 60, 120];

  return (
    <SceneShell hits={[HIT, ...ZAPS.slice(0, 4), SHATTER, TITLE + 2]} amp={30}>
      <GodRays opacity={f >= TITLE ? 0.9 * tS : 0.4 * orbIn * (1 - danger)} color={f >= TITLE ? C.cyan : col} y="43%" />
      <Canvas>
        {alive && (
          <g opacity={orbIn * flick} transform={`translate(${CX} ${CY}) scale(${orbIn * breathe}) translate(${-CX} ${-CY})`}>
            {rings.map((rot, i) => {
              const a = f * (0.05 + i * 0.012) + i * 2;
              const ex = Math.cos(a) * orbitR;
              const ey = Math.sin(a) * orbitR * 0.28;
              const rr = ((rot + f * 0.3) * Math.PI) / 180;
              const px = CX + ex * Math.cos(rr) - ey * Math.sin(rr);
              const py = CY + ex * Math.sin(rr) + ey * Math.cos(rr);
              return (
                <g key={i}>
                  <ellipse
                    cx={CX}
                    cy={CY}
                    rx={orbitR}
                    ry={orbitR * 0.28}
                    fill="none"
                    stroke={alpha(col, 0.55)}
                    strokeWidth={2.5}
                    transform={`rotate(${rot + f * 0.3} ${CX} ${CY})`}
                  />
                  <Orb id={`e${i}`} x={px} y={py} r={10} color={i === 1 ? C.magenta : col} halo={4} />
                </g>
              );
            })}
            <Orb id="core" x={CX} y={CY} r={92} color={col} halo={3.2} intensity={1.2} />
            {/* 裂纹 */}
            {f >= HIT &&
              new Array(7).fill(0).map((_, i) => {
                const grow = prog(f, HIT + i * 6, HIT + i * 6 + 10, easeOut);
                if (grow <= 0) return null;
                const ang = random(`ca${i}`) * Math.PI * 2;
                const L = 70 + 90 * grow;
                const pts: string[] = [`M${CX},${CY}`];
                for (let k = 1; k <= 5; k++) {
                  const d = (L * k) / 5;
                  const jit = (random(`cj${i}${k}`) - 0.5) * 30;
                  pts.push(`L${CX + Math.cos(ang) * d - Math.sin(ang) * jit},${CY + Math.sin(ang) * d + Math.cos(ang) * jit}`);
                }
                return (
                  <path
                    key={i}
                    d={pts.join('')}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={4}
                    style={{filter: `drop-shadow(0 0 8px ${C.red})`}}
                  />
                );
              })}
          </g>
        )}
        {ZAPS.map((z, i) => {
          const ang = random(`za${i}`) * Math.PI * 2;
          return (
            <Lightning
              key={i}
              x1={CX + Math.cos(ang) * 620}
              y1={CY + Math.sin(ang) * 620}
              x2={CX + Math.cos(ang) * 80}
              y2={CY + Math.sin(ang) * 80}
              start={z - 3}
              seed={`z${i}`}
              color={i % 2 ? C.red : C.magenta}
              width={4}
              hold={5}
            />
          );
        })}
        <Burst x={CX} y={CY} start={SHATTER} seed="shatter" count={90} speed={46} life={50} colors={[C.red, C.white, C.orange, C.magenta]} width={5} />
        <Shockwave x={CX} y={CY} start={SHATTER} color={C.red} maxR={900} />
        {/* 标题背后的六边形护盾 */}
        {f >= TITLE && (
          <g opacity={hex} transform={`rotate(${f * 0.4} ${CX} ${CY})`}>
            {[300, 360, 430].map((R, k) => {
              const pts = new Array(6)
                .fill(0)
                .map((_, i) => {
                  const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
                  return `${CX + Math.cos(a) * R * hex},${CY + Math.sin(a) * R * hex}`;
                })
                .join(' ');
              return (
                <polygon
                  key={k}
                  points={pts}
                  fill="none"
                  stroke={alpha(k === 1 ? C.magenta : C.cyan, 0.7 - k * 0.18)}
                  strokeWidth={4 - k}
                  strokeDasharray={k === 2 ? '18 14' : undefined}
                  style={{filter: `drop-shadow(0 0 12px ${C.cyan})`}}
                />
              );
            })}
          </g>
        )}
        <Shockwave x={CX} y={CY} start={TITLE + 2} color={C.cyan} maxR={1100} width={18} />
        <Burst x={CX} y={CY} start={TITLE + 2} seed="title" count={70} speed={55} life={45} colors={[C.cyan, C.white, C.violet]} />
      </Canvas>

      {f >= TITLE && (
        <AbsoluteFill style={{alignItems: 'center', top: CY - 150}}>
          <div style={{transform: `scale(${tScale})`, opacity: Math.min(1, tS * 2)}}>
            <GlitchText
              text="量子纠错"
              intensity={titleGlitch}
              seed="title"
              glow={C.cyan}
              style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 210, letterSpacing: 14, lineHeight: 1.2}}
            />
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: FONT.tech,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: 11,
              color: C.cyan,
              textShadow: `0 0 18px ${C.cyan}`,
              clipPath: `inset(0 ${(1 - sub) * 100}% 0 0)`,
            }}
          >
            QUANTUM ERROR CORRECTION
          </div>
        </AbsoluteFill>
      )}
      {f >= TITLE + 30 && (
        <div
          style={{
            position: 'absolute',
            top: 1330,
            width: '100%',
            textAlign: 'center',
            fontFamily: FONT.cn,
            fontWeight: 900,
            fontSize: 62,
            color: C.white,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 40}px)`,
            textShadow: '0 5px 0 rgba(0,0,0,.7)',
          }}
        >
          如何守护世界上<span style={{color: C.gold, textShadow: `0 0 24px ${C.gold}`}}>最脆弱</span>的信息？
        </div>
      )}

      <Captions
        items={[
          {at: 6, to: HIT, text: '量子计算机的超能力，来自**量子比特**', color: C.cyan},
          {at: HIT, to: 104, text: '但它极其**脆弱**', color: C.red},
          {at: 104, to: SHATTER + 4, text: '**一丝干扰**，信息就会崩溃', color: C.red},
        ]}
      />
      <GlitchBars intensity={Math.max(glitch * 0.8, impulse(f, [SHATTER, TITLE + 2], 4))} />
      <Flash opacity={impulse(f, [SHATTER], 5) * 0.85 + impulse(f, [TITLE + 2], 4) * 0.6} />
      <Flash opacity={f >= HIT && f < SHATTER ? impulse(f, ZAPS, 2) * 0.25 : 0} color={C.red} />
      {/* 下坠暗场，营造“崩溃→寂静→爆发” */}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(f, [TITLE - 5, TITLE - 2, TITLE, TITLE + 1], [0, 0.75, 0.75, 0], CLAMP)}} />
      <AbsoluteFill style={{opacity: interpolate(f, [0, 8], [1, 0], {...CLAMP, easing: easeOut}), background: '#000'}} />
    </SceneShell>
  );
};
