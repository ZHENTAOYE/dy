import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Background} from './components/Background';
import {Canvas, GodRays, Orb} from './components/fx';
import {buildLattice, plaqPath} from './components/Lattice';
import {Overlay} from './components/Overlay';
import {alpha, C, FONT} from './theme';

const D = 7;
const S = 120;
const OX = 540 - 3 * S;
const OY = 1240 - 3 * S;

/** 抖音封面（静帧） */
export const Cover: React.FC = () => (
  <AbsoluteFill>
    <Background tintA={C.violet} tintB={C.cyan} danger={0} />
    <GodRays opacity={0.9} color={C.cyan} y="34%" />
    <Canvas>
      <g transform="translate(540 1240) scale(1 0.55) rotate(45) translate(-540 -1240)" opacity={0.75}>
        {buildLattice(D).map((p) => {
          const col = p.type === 'X' ? C.cyan : C.magenta;
          const hot = p.key === 's2-3' || p.key === 's4-3';
          return (
            <path
              key={p.key}
              d={plaqPath(p, S, OX, OY, 0.95)}
              fill={hot ? alpha(C.red, 0.55) : alpha(col, 0.18)}
              stroke={hot ? C.red : alpha(col, 0.8)}
              strokeWidth={3}
            />
          );
        })}
        {new Array(D * D).fill(0).map((_, n) => (
          <circle key={n} cx={OX + (n % D) * S} cy={OY + Math.floor(n / D) * S} r={14} fill={n === 24 ? C.red : C.white} />
        ))}
      </g>
      <Orb id="cv" x={540} y={650} r={120} color={C.cyan} halo={3.2} intensity={1.2} />
      {[0, 60, 120].map((rot, i) => (
        <ellipse
          key={i}
          cx={540}
          cy={650}
          rx={290}
          ry={80}
          fill="none"
          stroke={alpha(i === 1 ? C.magenta : C.cyan, 0.6)}
          strokeWidth={3}
          transform={`rotate(${rot + 15} 540 650)`}
        />
      ))}
    </Canvas>
    <AbsoluteFill style={{alignItems: 'center', top: 930}}>
      <div
        style={{
          fontFamily: FONT.cn,
          fontWeight: 900,
          fontSize: 200,
          letterSpacing: 12,
          color: C.white,
          textShadow: `0 0 30px ${C.cyan}, 0 0 90px ${alpha(C.cyan, 0.6)}, 0 8px 0 rgba(0,0,0,.6)`,
        }}
      >
        量子纠错
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT.cn,
          fontWeight: 900,
          fontSize: 64,
          color: C.white,
          padding: '10px 36px',
          background: alpha(C.red, 0.85),
          borderRadius: 14,
          boxShadow: `0 0 40px ${alpha(C.red, 0.7)}`,
        }}
      >
        量子计算机的<span style={{color: C.gold}}>救命稻草</span>？
      </div>
      <div style={{marginTop: 26, fontFamily: FONT.tech, fontWeight: 700, fontSize: 30, letterSpacing: 10, color: C.cyan}}>
        QUANTUM ERROR CORRECTION
      </div>
    </AbsoluteFill>
    <Overlay />
  </AbsoluteFill>
);
