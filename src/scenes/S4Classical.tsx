import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Burst, Canvas, Flash, GlitchBars, GlowPath, Lightning, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag, GlitchText} from '../components/text';
import {CLAMP, easeOut, impulse, pop, prog} from '../lib/anim';
import {alpha, C, FONT, mix} from '../theme';

const Y = 760;
const SPLIT = 44;
const STRIKE = 104;
const VOTE = 152;
const FIX = 196;

const Tile: React.FC<{x: number; y: number; v: string; color: string; s: number; glitch: number; seed: string; ring: number}> = ({
  x,
  y,
  v,
  color,
  s,
  glitch,
  seed,
  ring,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 115,
      top: y - 115,
      width: 230,
      height: 230,
      borderRadius: 28,
      border: `4px solid ${color}`,
      background: `linear-gradient(160deg, ${alpha(color, 0.3)}, ${alpha(color, 0.06)})`,
      boxShadow: `0 0 ${30 + ring * 50}px ${alpha(color, 0.6 + ring * 0.4)}, inset 0 0 40px ${alpha(color, 0.25)}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `scale(${s})`,
    }}
  >
    <GlitchText
      text={v}
      intensity={glitch}
      seed={seed}
      color={C.white}
      glow={color}
      style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 160, lineHeight: 1}}
    />
  </div>
);

export const S4Classical: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const appear = pop(f, fps, 4, {damping: 10, stiffness: 150});
  const split = pop(f, fps, SPLIT, {damping: 13, stiffness: 120});
  const xs = [540 - 300 * split, 540, 540 + 300 * split];
  const sideS = Math.min(1, split * 1.2);
  const struck = f >= STRIKE + 3;
  const fixed = f >= FIX + 4;
  const mid = struck && !fixed ? '1' : '0';
  const midColor = struck && !fixed ? C.red : fixed ? mix(C.green, C.cyan, prog(f, FIX + 10, FIX + 40)) : C.cyan;
  const ring = impulse(f, [FIX + 4], 10);
  const voteP = prog(f, VOTE, VOTE + 22, easeOut);
  const voteVis = interpolate(f, [VOTE, VOTE + 8], [0, 1], CLAMP);
  const result = pop(f, fps, VOTE + 26, {damping: 9, stiffness: 200});

  const BY = 1130;

  return (
    <SceneShell hits={[STRIKE + 3, FIX + 4]} amp={24}>
      <ChapterTag n="03" title="经典纠错" en="REPETITION CODE" color={C.blue} />
      <Canvas>
        {/* 复制时的拖影 */}
        {f >= SPLIT && f < SPLIT + 20 && (
          <g opacity={1 - prog(f, SPLIT + 4, SPLIT + 20)}>
            <GlowPath d={`M540,${Y}L${xs[0]},${Y}`} color={C.cyan} width={10} />
            <GlowPath d={`M540,${Y}L${xs[2]},${Y}`} color={C.cyan} width={10} />
          </g>
        )}
        <Lightning x1={560} y1={160} x2={540} y2={Y - 120} start={STRIKE} seed="strike" color={C.violet} width={8} len={3} hold={12} branches={4} />
        <Burst x={540} y={Y} start={STRIKE + 3} seed="cb" count={50} speed={36} colors={[C.red, C.white, C.violet]} />
        <Shockwave x={540} y={Y} start={STRIKE + 3} color={C.red} maxR={500} />
        {/* 投票连线 */}
        {voteVis > 0 &&
          xs.map((x, i) => {
            const d = `M${x},${Y + 130}C${x},${Y + 240} 540,${BY - 140} 540,${BY - 70}`;
            return (
              <g key={i} opacity={voteVis}>
                <path d={d} fill="none" stroke={alpha(i === 1 ? C.red : C.cyan, 0.25)} strokeWidth={4} />
                <GlowPath d={d} color={i === 1 ? C.red : C.cyan} width={4} dash={`${voteP * 600} 600`} />
              </g>
            );
          })}
        <Shockwave x={540} y={Y} start={FIX + 4} color={C.green} maxR={650} />
        {[0, 1, 2].map((i) => (
          <Shockwave key={i} x={xs[i]} y={Y} start={FIX + 8 + i * 3} color={C.green} maxR={200} dur={20} width={6} rings={1} />
        ))}
        {/* 修复光束 */}
        {f >= FIX - 4 && f < FIX + 14 && (
          <g opacity={1 - prog(f, FIX + 4, FIX + 14)}>
            <GlowPath d={`M540,${BY - 80}L540,${Y + 100}`} color={C.green} width={12 * prog(f, FIX - 4, FIX + 2)} />
          </g>
        )}
      </Canvas>

      <Tile x={xs[0]} y={Y} v="0" color={fixed ? midColor : C.cyan} s={appear * sideS} glitch={0} seed="t0" ring={ring} />
      <Tile x={xs[2]} y={Y} v="0" color={fixed ? midColor : C.cyan} s={appear * sideS} glitch={0} seed="t2" ring={ring} />
      <Tile
        x={xs[1]}
        y={Y}
        v={mid}
        color={midColor}
        s={appear * (1 + impulse(f, [STRIKE + 3], 5) * 0.2)}
        glitch={struck && !fixed ? 0.2 + impulse(f, [STRIKE + 3, FIX + 2], 4) : impulse(f, [FIX + 4], 4)}
        seed="t1"
        ring={ring}
      />

      {/* 投票结果 */}
      {voteVis > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 540 - 300,
            width: 600,
            top: BY - 70,
            textAlign: 'center',
            opacity: voteVis,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 22,
              padding: '18px 40px',
              borderRadius: 24,
              border: `3px solid ${alpha(C.gold, 0.8)}`,
              background: alpha(C.gold, 0.08),
              boxShadow: `0 0 40px ${alpha(C.gold, 0.35)}`,
              fontFamily: FONT.cn,
              fontWeight: 900,
              fontSize: 64,
              color: C.white,
            }}
          >
            <span style={{color: C.cyan}}>0</span>
            <span style={{color: C.red}}>1</span>
            <span style={{color: C.cyan}}>0</span>
            <span style={{fontFamily: FONT.cn, fontSize: 52, color: C.dim}}>→</span>
            <span
              style={{
                color: C.gold,
                display: 'inline-block',
                transform: `scale(${0.3 + 0.7 * result})`,
                opacity: result,
                textShadow: `0 0 30px ${C.gold}`,
                fontSize: 84,
              }}
            >
              0
            </span>
          </div>
          <div style={{fontFamily: FONT.cn, fontWeight: 700, fontSize: 32, color: C.gold, marginTop: 14, letterSpacing: 6}}>
            多数投票
          </div>
        </div>
      )}

      <Captions
        items={[
          {at: 6, to: SPLIT + 6, text: '经典世界里，有个简单办法：**备份**', color: C.cyan},
          {at: SPLIT + 8, to: STRIKE, text: '一份复制成三份——**重复码**', color: C.cyan},
          {at: STRIKE + 2, to: VOTE, text: '噪声随机**翻转**了一位', color: C.red},
          {at: VOTE, to: FIX + 22, text: '**少数服从多数**，立刻纠正！', color: C.gold},
          {at: FIX + 24, to: 268, text: '那给量子比特也**备份**一下？', color: C.magenta},
        ]}
      />
      <GlitchBars intensity={impulse(f, [STRIKE + 3], 5)} seed="c4" />
      <Flash opacity={impulse(f, [STRIKE + 2], 3) * 0.7} color="#d9d2ff" />
      <Flash opacity={impulse(f, [FIX + 4], 5) * 0.25} color={C.green} />
    </SceneShell>
  );
};
