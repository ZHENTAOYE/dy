import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {BlochSphere} from '../components/BlochSphere';
import {Canvas, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag} from '../components/text';
import {CLAMP, DEG, lerp, pop, prog} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

const CX = 540;
const CY = 760;
const R = 300;

const FREE = 104;
const SETTLE = 196;
const FORMULA = 200;

/** 态矢量 (θ, φ) 随时间的轨迹：先在两极间翻转（经典），再自由漫游（量子），最后停在叠加态 */
const stateAt = (f: number) => {
  const flip1 = prog(f, 38, 50);
  const flip2 = prog(f, 72, 84);
  let theta = Math.PI * flip1 * (1 - flip2);
  let phi = 0.3;
  const t = f - FREE;
  const w = prog(f, FREE, FREE + 22);
  const pTheta = Math.PI / 2 + 1.15 * Math.sin(t * 0.055 - 1.25);
  const pPhi = 0.3 + t * 0.075;
  theta = lerp(theta, pTheta, w);
  phi = lerp(phi, pPhi, w);
  const s = prog(f, SETTLE - 6, SETTLE + 24);
  const endPhi = 0.3 + (SETTLE + 24 - FREE) * 0.075 + 0.4;
  theta = lerp(theta, 62 * DEG, s);
  phi = lerp(phi, endPhi + Math.sin(f * 0.03) * 0.15, s);
  return {theta, phi};
};

export const S2Qubit: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const appear = pop(f, fps, 0, {damping: 14, stiffness: 90});
  const yaw = (-35 + f * 0.25) * DEG;
  const {theta, phi} = stateAt(f);

  const trail = [];
  if (f > FREE) {
    for (let k = 26; k >= 0; k--) trail.push(stateAt(Math.max(FREE, f - k)));
  }
  const trailFade = interpolate(f, [SETTLE + 10, SETTLE + 40], [1, 0], CLAMP);

  const atTop = Math.cos(theta);
  const hl0 = f < FREE ? Math.max(0, atTop) ** 8 : 0;
  const hl1 = f < FREE ? Math.max(0, -atTop) ** 8 : 0;

  const fS = pop(f, fps, FORMULA, {damping: 12, stiffness: 140});
  const abPulse = 0.5 + 0.5 * Math.sin((f - 270) * 0.25);
  const abGlow = f > 270 ? abPulse : 0;

  const digit = theta < Math.PI / 2 ? '0' : '1';
  const bitBox = interpolate(f, [8, 18, FREE - 8, FREE], [0, 1, 1, 0], CLAMP);

  return (
    <SceneShell hits={[50, 84]} amp={10}>
      <ChapterTag n="01" title="量子比特" en="QUBIT" />
      <Canvas>
        <BlochSphere
          id="b2"
          cx={CX}
          cy={CY}
          r={R}
          yaw={yaw}
          theta={theta}
          phi={phi}
          appear={appear}
          trail={trailFade > 0.01 && trail.length ? trail : undefined}
          hl0={hl0}
          hl1={hl1}
        />
        <g opacity={trailFade}>
          <Shockwave x={CX} y={CY - R * 0.93} start={84} color={C.gold} maxR={160} dur={18} width={6} rings={2} />
          <Shockwave x={CX} y={CY + R * 0.93} start={50} color={C.gold} maxR={160} dur={18} width={6} rings={2} />
        </g>
      </Canvas>

      {/* 经典比特读数 */}
      <div
        style={{
          position: 'absolute',
          right: 70,
          top: 360,
          opacity: bitBox,
          textAlign: 'center',
          fontFamily: FONT.tech,
        }}
      >
        <div style={{fontSize: 22, letterSpacing: 6, color: C.dim, fontWeight: 700}}>BIT</div>
        <div
          style={{
            width: 130,
            height: 150,
            marginTop: 8,
            border: `3px solid ${C.gold}`,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 110,
            fontWeight: 900,
            fontFamily: FONT.cn,
            color: C.gold,
            background: alpha(C.gold, 0.08),
            boxShadow: `0 0 30px ${alpha(C.gold, 0.5)}, inset 0 0 30px ${alpha(C.gold, 0.2)}`,
            textShadow: `0 0 20px ${C.gold}`,
          }}
        >
          {digit}
        </div>
      </div>

      {/* 叠加态公式 */}
      {f >= FORMULA && (
        <div
          style={{
            position: 'absolute',
            top: 1185,
            width: '100%',
            textAlign: 'center',
            fontFamily: FONT.math,
            fontSize: 84,
            color: C.white,
            opacity: Math.min(1, fS * 1.5),
            transform: `scale(${0.6 + 0.4 * fS})`,
            textShadow: `0 0 24px ${alpha(C.cyan, 0.7)}`,
            letterSpacing: 2,
          }}
        >
          |ψ⟩ ={' '}
          <span style={{color: C.cyan, textShadow: `0 0 ${20 + abGlow * 40}px ${C.cyan}`, fontSize: 84 * (1 + abGlow * 0.12)}}>α</span>
          |0⟩ +{' '}
          <span style={{color: C.magenta, textShadow: `0 0 ${20 + abGlow * 40}px ${C.magenta}`, fontSize: 84 * (1 + abGlow * 0.12)}}>β</span>
          |1⟩
        </div>
      )}

      <Captions
        items={[
          {at: 10, to: FREE - 2, text: '经典比特：非 **0** 即 **1**'},
          {at: FREE, to: SETTLE, text: '量子比特：\n可以指向球面上的**任意方向**', color: C.cyan},
          {at: SETTLE + 2, to: 268, text: '这就是神奇的**叠加态**', color: C.magenta},
          {at: 270, to: 356, text: '量子信息，\n全都藏在 **α** 和 **β** 之中', color: C.cyan},
        ]}
      />
    </SceneShell>
  );
};
