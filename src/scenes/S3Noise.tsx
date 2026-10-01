import React from 'react';
import {interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {BlochSphere} from '../components/BlochSphere';
import {Burst, Canvas, Flash, GlitchBars, GlowPath, Lightning, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag, GlitchText, Pow} from '../components/text';
import {CLAMP, DEG, easeOut, impulse, inOut, pop, prog, vnoise} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

const CX = 540;
const CY = 790;
const R = 290;

const SOURCES = [
  {label: '热噪声', color: C.orange, at: 18, from: [-260, 300], to: [190, 420]},
  {label: '电磁干扰', color: C.gold, at: 36, from: [1340, 420], to: [880, 470]},
  {label: '宇宙射线', color: C.magenta, at: 54, from: [-260, 1200], to: [200, 1150]},
  {label: '材料缺陷', color: C.red, at: 72, from: [1340, 1150], to: [870, 1120]},
];
const ARRIVE = 14;
const ZAPS = [104, 113, 121, 128, 136, 143, 151, 158, 166, 174, 182];

const DECO = 128;
const SPLIT = 200;
const LADDER = 304;

const flipPos = (f: number, times: number[]) =>
  times.reduce((acc, t, k) => acc + (k % 2 === 0 ? 1 : -1) * prog(f, t, t + 10), 0);

export const S3Noise: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // —— 大球：被噪声轰炸 ——
  const bigVis = interpolate(f, [SPLIT - 8, SPLIT + 2], [1, 0], CLAMP);
  const j = prog(f, 24, 120);
  const danger = prog(f, 30, 150);
  const len = interpolate(f, [DECO, DECO + 60], [1, 0.12], {...CLAMP, easing: easeOut});
  const theta = 62 * DEG + j * 0.6 * vnoise('th', f * 0.4);
  const phi = 1.2 + f * 0.01 + j * 1.5 * vnoise('ph', f * 0.32);
  const hitFrames = SOURCES.map((s) => s.at + ARRIVE);

  // —— 两种错误 ——
  const miniVis = inOut(f, SPLIT, LADDER, 10);
  const miniPop = pop(f, fps, SPLIT, {damping: 12, stiffness: 140});
  const xFlips = [222, 248, 274];
  const zFlips = [235, 261, 287];
  const xPos = flipPos(f, xFlips);
  const zPos = flipPos(f, zFlips);

  // —— 错误率阶梯 ——
  const lad = inOut(f, LADDER, 999, 10);
  const yOf = (e: number) => 430 + (-1 - e) * (800 / 11);
  const axis = prog(f, LADDER, LADDER + 24, easeOut);
  const redM = pop(f, fps, LADDER + 18);
  const greenM = pop(f, fps, LADDER + 40);
  const gap = prog(f, LADDER + 58, LADDER + 78, easeOut);
  const GAP_HIT = LADDER + 80;
  const gapS = pop(f, fps, GAP_HIT, {damping: 10, stiffness: 220});

  const glitchI = f < SPLIT ? Math.max(impulse(f, hitFrames, 4) * 0.8, f > DECO ? impulse(f, ZAPS, 3) * 0.6 : 0) : 0;

  return (
    <SceneShell hits={[...hitFrames, DECO, GAP_HIT]} amp={22}>
      <ChapterTag n="02" title="噪声与退相干" en="NOISE · DECOHERENCE" color={C.red} />
      <Canvas>
        {bigVis > 0 && (
          <g opacity={bigVis}>
            <BlochSphere id="b3" cx={CX} cy={CY} r={R} yaw={(-20 + f * 0.25) * DEG} theta={theta} phi={phi} len={len} danger={danger} />
            {SOURCES.map((s, i) => (
              <Lightning
                key={i}
                x1={s.to[0]}
                y1={s.to[1]}
                x2={CX + (s.to[0] - CX) * 0.25}
                y2={CY + (s.to[1] - CY) * 0.25}
                start={s.at + ARRIVE - 3}
                seed={`src${i}`}
                color={s.color}
                width={5}
                hold={8}
              />
            ))}
            {SOURCES.map((s, i) => (
              <Burst
                key={`b${i}`}
                x={CX + (s.to[0] - CX) * 0.25}
                y={CY + (s.to[1] - CY) * 0.25}
                start={s.at + ARRIVE}
                seed={`sb${i}`}
                count={24}
                speed={22}
                life={26}
                colors={[s.color, C.white]}
              />
            ))}
            {ZAPS.map((z, i) => {
              const s = SOURCES[Math.floor(random(`zs${i}`) * SOURCES.length)];
              const a = random(`zang${i}`) * Math.PI * 2;
              return (
                <Lightning
                  key={`z${i}`}
                  x1={s.to[0]}
                  y1={s.to[1]}
                  x2={CX + Math.cos(a) * R * 0.5}
                  y2={CY + Math.sin(a) * R * 0.5}
                  start={z - 2}
                  seed={`zz${i}`}
                  color={s.color}
                  width={3}
                  len={3}
                  hold={4}
                  branches={1}
                />
              );
            })}
            <Shockwave x={CX} y={CY} start={DECO} color={C.red} maxR={700} />
          </g>
        )}

        {miniVis > 0 && (
          <g opacity={miniVis}>
            <BlochSphere
              id="bx"
              cx={285}
              cy={800}
              r={165 * miniPop}
              yaw={(-30 + f * 0.3) * DEG}
              theta={Math.PI * xPos}
              phi={0.6}
              hl0={Math.max(0, Math.cos(Math.PI * xPos)) ** 8}
              hl1={Math.max(0, -Math.cos(Math.PI * xPos)) ** 8}
            />
            <BlochSphere
              id="bz"
              cx={795}
              cy={800}
              r={165 * miniPop}
              yaw={-20 * DEG}
              theta={Math.PI / 2}
              phi={Math.PI * zPos - 20 * DEG + Math.PI / 2}
              color={C.violet}
              labels="x"
            />
            {xFlips.map((t, i) => (
              <Shockwave key={`xs${i}`} x={285} y={800} start={t + 10} color={C.red} maxR={230} dur={16} width={6} rings={1} />
            ))}
            {zFlips.map((t, i) => (
              <Shockwave key={`zs${i}`} x={795} y={800} start={t + 10} color={C.red} maxR={230} dur={16} width={6} rings={1} />
            ))}
          </g>
        )}

        {lad > 0 && (
          <g opacity={lad}>
            <GlowPath d={`M300,${yOf(-1)}L300,${yOf(-1) + (yOf(-12) - yOf(-1)) * axis}`} color={C.blue} width={3} />
            {new Array(12).fill(0).map((_, k) => {
              const e = -1 - k;
              const vis = axis * 12 > k ? 1 : 0;
              return <line key={k} x1={284} x2={316} y1={yOf(e)} y2={yOf(e)} stroke={C.white} strokeWidth={2} opacity={vis * 0.6} />;
            })}
            {/* 需求区间 */}
            <rect
              x={300}
              y={yOf(-9)}
              width={680 * greenM}
              height={yOf(-12) - yOf(-9)}
              fill={alpha(C.green, 0.14)}
              stroke={alpha(C.green, 0.8)}
              strokeWidth={2}
            />
            {/* 当前水平 */}
            <GlowPath d={`M300,${yOf(-3)}L${300 + 680 * redM},${yOf(-3)}`} color={C.red} width={4} />
            {/* 差距箭头 */}
            {gap > 0 && (
              <g>
                <GlowPath
                  d={`M380,${yOf(-3) + 14}L380,${yOf(-3) + 14 + (yOf(-9) - yOf(-3) - 28) * gap}`}
                  color={C.gold}
                  width={6}
                />
                <path d={`M366,${yOf(-3) + 30}L380,${yOf(-3) + 10}L394,${yOf(-3) + 30}Z`} fill={C.gold} />
                {gap > 0.95 && <path d={`M366,${yOf(-9) - 30}L380,${yOf(-9) - 10}L394,${yOf(-9) - 30}Z`} fill={C.gold} />}
              </g>
            )}
            <Shockwave x={600} y={(yOf(-3) + yOf(-9)) / 2} start={GAP_HIT} color={C.gold} maxR={500} />
          </g>
        )}
      </Canvas>

      {/* 噪声来源标签 */}
      {bigVis > 0 &&
        SOURCES.map((s, i) => {
          const p = pop(f, fps, s.at, {damping: 14, stiffness: 120});
          const x = s.from[0] + (s.to[0] - s.from[0]) * p;
          const y = s.from[1] + (s.to[1] - s.from[1]) * p;
          const hit = impulse(f, [s.at + ARRIVE], 6);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${1 + hit * 0.25})`,
                padding: '12px 26px',
                borderRadius: 999,
                border: `3px solid ${s.color}`,
                background: alpha(s.color, 0.14 + hit * 0.4),
                color: C.white,
                fontFamily: FONT.cn,
                fontWeight: 900,
                fontSize: 38,
                boxShadow: `0 0 ${24 + hit * 40}px ${alpha(s.color, 0.7)}`,
                opacity: bigVis,
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </div>
          );
        })}

      {f >= DECO && bigVis > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 1095,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: bigVis * Math.min(1, pop(f, fps, DECO) * 1.5),
            transform: `scale(${1.6 - 0.6 * pop(f, fps, DECO, {damping: 10, stiffness: 200})})`,
          }}
        >
          <GlitchText
            text="退相干"
            intensity={0.15 + impulse(f, [DECO, ...ZAPS], 3) * 0.8}
            seed="deco"
            color={C.white}
            glow={C.red}
            style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 120, letterSpacing: 20}}
          />
          <div style={{fontFamily: FONT.tech, fontWeight: 700, fontSize: 26, letterSpacing: 12, color: C.red, marginTop: -6}}>
            DECOHERENCE
          </div>
        </div>
      )}

      {/* 两种错误的标题 */}
      {miniVis > 0 &&
        [
          {x: 285, t: '比特翻转', g: 'X', s: '|0⟩ ↔ |1⟩', c: C.cyan},
          {x: 795, t: '相位翻转', g: 'Z', s: '|+⟩ ↔ |−⟩', c: C.violet},
        ].map((m, i) => {
          const p = pop(f, fps, SPLIT + 6 + i * 6);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: m.x - 230,
                width: 460,
                top: 400,
                textAlign: 'center',
                opacity: miniVis * Math.min(1, p * 1.4),
                transform: `translateY(${(1 - p) * 40}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT.tech,
                  fontWeight: 900,
                  fontSize: 120,
                  lineHeight: 1,
                  color: m.c,
                  textShadow: `0 0 30px ${m.c}`,
                }}
              >
                {m.g}
              </div>
              <div style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 48, color: C.white, marginTop: 6}}>{m.t}</div>
              <div style={{fontFamily: FONT.math, fontSize: 40, color: alpha(C.white, 0.85), marginTop: 455}}>{m.s}</div>
            </div>
          );
        })}

      {/* 错误率阶梯的文字 */}
      {lad > 0 && (
        <div style={{position: 'absolute', inset: 0, opacity: lad}}>
          {new Array(12).fill(0).map((_, k) => {
            const e = -1 - k;
            const vis = axis * 12 > k ? 1 : 0;
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  right: 1080 - 268,
                  top: yOf(e) - 22,
                  fontFamily: FONT.cn,
                  fontWeight: 900,
                  fontSize: 34,
                  color: e === -3 ? C.red : e <= -9 ? C.green : C.dim,
                  opacity: vis,
                }}
              >
                <Pow exp={`-${k + 1}`} />
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute',
              left: 430,
              top: yOf(-3) - 104,
              opacity: redM,
              transform: `translateX(${(1 - redM) * 60}px)`,
              fontFamily: FONT.cn,
            }}
          >
            <div style={{fontWeight: 900, fontSize: 42, color: C.red, textShadow: `0 0 20px ${alpha(C.red, 0.7)}`}}>今天最好的物理比特</div>
            <div style={{fontWeight: 700, fontSize: 30, color: C.white, opacity: 0.85}}>每操作约一千次，就出错一次</div>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 430,
              top: yOf(-10) - 50,
              opacity: greenM,
              transform: `translateX(${(1 - greenM) * 60}px)`,
              fontFamily: FONT.cn,
            }}
          >
            <div style={{fontWeight: 900, fontSize: 42, color: C.green, textShadow: `0 0 20px ${alpha(C.green, 0.7)}`}}>实用量子算法的需求</div>
            <div style={{fontWeight: 700, fontSize: 30, color: C.white, opacity: 0.85}}>连续数十亿次操作不出错</div>
          </div>
          {f >= GAP_HIT && (
            <div
              style={{
                position: 'absolute',
                left: 430,
                top: (yOf(-3) + yOf(-9)) / 2 - 80,
                transformOrigin: 'left center',
                transform: `scale(${2.2 - 1.2 * gapS})`,
                opacity: Math.min(1, gapS * 2),
              }}
            >
              <div style={{fontFamily: FONT.cn, fontWeight: 700, fontSize: 36, color: C.white}}>差距</div>
              <GlitchText
                text="百万倍以上"
                intensity={impulse(f, [GAP_HIT], 5)}
                seed="gap"
                color={C.gold}
                glow={C.gold}
                style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 96}}
              />
            </div>
          )}
        </div>
      )}

      <Captions
        items={[
          {at: 6, to: DECO - 2, text: '可是，现实世界**太吵了**', color: C.red},
          {at: DECO, to: SPLIT - 2, text: '量子态被一点点“磨”掉——**退相干**', color: C.red},
          {at: SPLIT + 4, to: LADDER - 2, text: '两种基本错误：\n**比特翻转** 与 **相位翻转**', color: C.cyan},
          {at: LADDER + 4, to: GAP_HIT - 2, text: '而实用算法，要求错误率低得多', color: C.gold},
          {at: GAP_HIT, to: 418, text: '光靠改进硬件，**远远不够**', color: C.gold},
        ]}
      />
      <GlitchBars intensity={glitchI} seed="n3" />
      <Flash opacity={impulse(f, hitFrames, 3) * 0.25 + impulse(f, [GAP_HIT], 4) * 0.35} color={f < SPLIT ? C.red : C.gold} />
    </SceneShell>
  );
};
