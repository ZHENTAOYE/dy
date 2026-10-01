import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Burst, Canvas, Flash, GlitchBars, GodRays, Orb, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, GlitchText} from '../components/text';
import {CLAMP, easeIn, impulse, lerp, pop, prog, vnoise} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

const CX = 540;
const CY = 800;
const SWIRL = 88;
const MERGE = 166;
const TITLE = 196;
const N = 260;
const PALETTE = [C.cyan, C.magenta, C.violet, C.blue, C.white];

export const S9Outro: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const parts = useMemo(
    () =>
      new Array(N).fill(0).map((_, i) => ({
        x: 60 + random(`ox${i}`) * 960,
        y: 300 + random(`oy${i}`) * 1000,
        r: 3 + random(`or${i}`) * 6,
        c: PALETTE[i % PALETTE.length],
        delay: random(`od${i}`) * 26,
        bad: random(`ob${i}`) < 0.22,
      })),
    [],
  );

  const orbS = pop(f, fps, MERGE, {damping: 9, stiffness: 140});
  const lift = prog(f, TITLE - 10, TITLE + 20);
  const oy = lerp(CY, 560, lift);
  const oscale = lerp(1, 0.72, lift);
  const titleS = pop(f, fps, TITLE, {damping: 12, stiffness: 240, mass: 0.9});
  const line = pop(f, fps, TITLE + 22);
  const en = interpolate(f, [TITLE + 34, TITLE + 56], [0, 1], CLAMP);
  const end = interpolate(f, [284, 300], [0, 1], CLAMP);

  return (
    <SceneShell hits={[MERGE, TITLE + 2]} amp={26}>
      <GodRays opacity={orbS * 0.9} color={C.gold} y={`${(oy / 1920) * 100}%`} />
      <Canvas>
        {f < MERGE + 4 &&
          parts.map((p, i) => {
            const e = prog(f, SWIRL + p.delay, MERGE, easeIn);
            const jx = vnoise(`jx${i}`, f * 0.12) * 26 * (1 - e);
            const jy = vnoise(`jy${i}`, f * 0.12) * 26 * (1 - e);
            const dx = p.x + jx - CX;
            const dy = p.y + jy - CY;
            const r0 = Math.hypot(dx, dy);
            const a = Math.atan2(dy, dx) + e * e * 4;
            const rr = r0 * (1 - e);
            const x = CX + Math.cos(a) * rr;
            const y = CY + Math.sin(a) * rr;
            const flicker = p.bad && f < SWIRL && random(`fk${i}${Math.floor(f / 3)}`) > 0.6;
            const col = flicker ? C.red : p.c;
            const trail = e > 0.05 ? (
              <line
                x1={x}
                y1={y}
                x2={CX + Math.cos(a - 0.15) * (rr + 30 * e)}
                y2={CY + Math.sin(a - 0.15) * (rr + 30 * e)}
                stroke={alpha(col, 0.5)}
                strokeWidth={p.r}
                strokeLinecap="round"
              />
            ) : null;
            const appear = prog(f, i * 0.12, i * 0.12 + 10);
            return (
              <g key={i} opacity={appear}>
                {trail}
                <circle cx={x} cy={y} r={p.r * 2.6} fill={alpha(col, 0.18)} />
                <circle cx={x} cy={y} r={p.r * (1 - e * 0.4)} fill={col} />
              </g>
            );
          })}
        {f >= MERGE && (
          <g>
            <g transform={`translate(${CX} ${oy}) scale(${orbS * oscale}) translate(${-CX} ${-CY})`}>
              {[170, 215, 265].map((R, k) => {
                const rot = f * (k % 2 ? -0.6 : 0.45) + k * 20;
                const pts = new Array(6)
                  .fill(0)
                  .map((_, i) => {
                    const a = (i / 6) * Math.PI * 2 + (rot * Math.PI) / 180;
                    return `${CX + Math.cos(a) * R},${CY + Math.sin(a) * R}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={k}
                    points={pts}
                    fill={k === 0 ? alpha(C.gold, 0.08) : 'none'}
                    stroke={alpha(k === 1 ? C.cyan : C.gold, 0.85 - k * 0.2)}
                    strokeWidth={5 - k}
                    strokeDasharray={k === 2 ? '22 12' : undefined}
                    style={{filter: `drop-shadow(0 0 14px ${C.gold})`}}
                  />
                );
              })}
              <Orb id="logical" x={CX} y={CY} r={110} color={C.gold} halo={3} intensity={1.3} />
            </g>
          </g>
        )}
        <Shockwave x={CX} y={CY} start={MERGE} color={C.gold} maxR={1100} width={20} />
        <Burst x={CX} y={CY} start={MERGE} seed="merge" count={90} speed={52} life={50} colors={[C.gold, C.white, C.cyan]} width={5} />
        <Shockwave x={CX} y={830} start={TITLE + 2} color={C.cyan} maxR={900} />
      </Canvas>

      {f >= MERGE + 6 && f < TITLE + 6 && (
        <div
          style={{
            position: 'absolute',
            top: CY + 200,
            width: '100%',
            textAlign: 'center',
            fontFamily: FONT.cn,
            fontWeight: 900,
            fontSize: 44,
            letterSpacing: 10,
            color: C.gold,
            opacity: interpolate(f, [MERGE + 6, MERGE + 14, TITLE - 4, TITLE + 6], [0, 1, 1, 0], CLAMP),
            textShadow: `0 0 20px ${C.gold}`,
          }}
        >
          LOGICAL QUBIT · 逻辑比特
        </div>
      )}

      {f >= TITLE && (
        <AbsoluteFill style={{alignItems: 'center', top: 800}}>
          <div style={{transform: `scale(${3 - 2 * titleS})`, opacity: Math.min(1, titleS * 2)}}>
            <GlitchText
              text="量子纠错"
              intensity={Math.max(impulse(f, [TITLE + 2], 5), random(`og${Math.floor(f / 4)}`) > 0.94 ? 0.5 : 0)}
              seed="otitle"
              glow={C.cyan}
              style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 180, letterSpacing: 12}}
            />
          </div>
          <div
            style={{
              marginTop: 26,
              fontFamily: FONT.cn,
              fontWeight: 900,
              fontSize: 54,
              color: C.white,
              opacity: line,
              transform: `translateY(${(1 - line) * 40}px)`,
              textShadow: '0 5px 0 rgba(0,0,0,.7)',
            }}
          >
            通往实用量子计算机的<span style={{color: C.gold, textShadow: `0 0 24px ${C.gold}`}}>必经之路</span>
          </div>
          <div
            style={{
              marginTop: 30,
              fontFamily: FONT.tech,
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: 10,
              color: C.cyan,
              clipPath: `inset(0 ${(1 - en) * 100}% 0 0)`,
              textShadow: `0 0 16px ${C.cyan}`,
            }}
          >
            QUANTUM ERROR CORRECTION
          </div>
        </AbsoluteFill>
      )}

      <Captions
        items={[
          {at: 6, to: SWIRL, text: '成千上万个**脆弱**的物理比特', color: C.red},
          {at: SWIRL + 2, to: TITLE - 6, text: '凝聚成一个**可靠**的逻辑比特', color: C.gold},
        ]}
      />
      <GlitchBars intensity={impulse(f, [MERGE, TITLE + 2], 4) * 0.7} seed="o9" />
      <Flash opacity={impulse(f, [MERGE], 6) * 0.8 + impulse(f, [TITLE + 2], 4) * 0.4} />
      <AbsoluteFill style={{background: '#000', opacity: end}} />
    </SceneShell>
  );
};
