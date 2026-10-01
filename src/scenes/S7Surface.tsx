import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Burst, Canvas, Flash, GlitchBars, GlowPath, Lightning, Orb, Shockwave} from '../components/fx';
import {buildLattice, MiniLattice, Plaq, plaqPath} from '../components/Lattice';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag, GlitchText} from '../components/text';
import {CLAMP, easeOut, impulse, inOut, pop, prog} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

const D = 5;
const S = 150;
const CX = 540;
const CY = 800;
const OX = CX - ((D - 1) * S) / 2;
const OY = CY - ((D - 1) * S) / 2;
const PLAQS = buildLattice(D);

const CYCLE = [104, 119, 134, 149];
const ERR1 = 176;
const ERR2 = 236;
const DECODE = 292;
const CORRECT = 324;
const SCALE = 362;
const LOGI = 420;

const E1: [number, number] = [1, 2];
const E2: [number, number] = [2, 2];

const dataOf = (p: Plaq): [number, number][] => {
  if (p.kind === 'square')
    return [
      [p.i, p.j],
      [p.i + 1, p.j],
      [p.i, p.j + 1],
      [p.i + 1, p.j + 1],
    ];
  if (p.kind === 'top')
    return [
      [p.i, 0],
      [p.i + 1, 0],
    ];
  if (p.kind === 'bottom')
    return [
      [p.i, D - 1],
      [p.i + 1, D - 1],
    ];
  if (p.kind === 'left')
    return [
      [0, p.j],
      [0, p.j + 1],
    ];
  return [
    [D - 1, p.j],
    [D - 1, p.j + 1],
  ];
};

const gx = (i: number) => OX + i * S;
const gy = (j: number) => OY + j * S;

export const S7Surface: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const errors: [number, number][] = [];
  if (f >= ERR1 + 3 && f < CORRECT) errors.push(E1);
  if (f >= ERR2 + 3 && f < CORRECT) errors.push(E2);
  const isErr = (i: number, j: number) => errors.some((e) => e[0] === i && e[1] === j);
  const lit = (p: Plaq) => p.type === 'Z' && dataOf(p).filter(([i, j]) => isErr(i, j)).length % 2 === 1;

  const mainVis = interpolate(f, [SCALE - 4, SCALE + 10], [1, 0], CLAMP);
  const tilt = 16 - 10 * prog(f, 0, 120);
  const titleS = pop(f, fps, 2, {damping: 10, stiffness: 220});
  const titleOut = interpolate(f, [34, 46], [1, 0], CLAMP);

  const pathPts: [number, number][] = [
    [gx(0.5), gy(1.5)],
    [gx(1), gy(2)],
    [gx(1.5), gy(2.5)],
    [gx(2), gy(2)],
    [gx(2.5), gy(1.5)],
  ];
  const dec = prog(f, DECODE, DECODE + 26, easeOut);
  const decVis = interpolate(f, [CORRECT + 4, CORRECT + 18], [1, 0], CLAMP);
  const along = (t: number): [number, number] => {
    const segs = pathPts.length - 1;
    const x = Math.min(segs - 1e-6, Math.max(0, t) * segs);
    const n = Math.floor(x);
    const fr = x - n;
    const a = pathPts[n];
    const b = pathPts[n + 1];
    return [a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr];
  };
  const partial = () => {
    const n = Math.floor(Math.min(0.999999, dec) * (pathPts.length - 1));
    return [...pathPts.slice(0, n + 1), along(dec)].map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('');
  };
  const head = along(dec);

  // —— 码距对比 ——
  const cmpVis = inOut(f, SCALE + 4, 999, 10);
  const MINIS = [
    {d: 3, x: 180, n: 17},
    {d: 5, x: 460, n: 49},
    {d: 7, x: 820, n: 97},
  ];

  return (
    <SceneShell hits={[2, ERR1 + 3, ERR2 + 3, CORRECT]} amp={20}>
      <ChapterTag n="06" title="表面码" en="SURFACE CODE" color={C.violet} />

      {mainVis > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: mainVis,
            transform: `perspective(1800px) rotateX(${tilt}deg) scale(${1 - (1 - mainVis) * 0.3})`,
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <Canvas>
            {PLAQS.map((p) => {
              const dist = Math.hypot(p.cx - 2, p.cy - 2);
              const s = pop(f, fps, 14 + dist * 7, {damping: 12, stiffness: 140});
              const col = p.type === 'X' ? C.cyan : C.magenta;
              const cyc = impulse(f, p.type === 'X' ? [CYCLE[0], CYCLE[2]] : [CYCLE[1], CYCLE[3]], 7);
              const on = lit(p);
              const pulse = on ? 0.55 + 0.45 * Math.sin(f * 0.45) : 0;
              const fill = on ? alpha(C.red, 0.35 + pulse * 0.35) : alpha(col, 0.16 + cyc * 0.4);
              const stroke = on ? C.red : alpha(col, 0.75 + cyc * 0.25);
              return (
                <g key={p.key} opacity={Math.min(1, s * 1.4)}>
                  <path d={plaqPath(p, S, OX, OY, 0.96 * s)} fill={fill} stroke={stroke} strokeWidth={on ? 5 : 2.5} style={on ? {filter: `drop-shadow(0 0 18px ${C.red})`} : undefined} />
                  <circle cx={gx(p.cx)} cy={gy(p.cy)} r={(on ? 14 : 8) * s} fill={on ? C.white : alpha(col, 0.9 + cyc)} />
                </g>
              );
            })}
            {/* 稳定子类型标记 */}
            {PLAQS.filter((p) => p.kind === 'square').map((p) => (
              <text
                key={`t${p.key}`}
                x={gx(p.cx)}
                y={gy(p.cy) + 52}
                textAnchor="middle"
                fontFamily={FONT.tech}
                fontWeight={900}
                fontSize={26}
                fill={alpha(p.type === 'X' ? C.cyan : C.magenta, 0.7)}
                opacity={prog(f, 50, 70) * (lit(p) ? 0 : 1)}
              >
                {p.type}
              </text>
            ))}
            {PLAQS.filter(lit).map((p) => (
              <text
                key={`a${p.key}`}
                x={gx(p.cx)}
                y={gy(p.cy) + 18}
                textAnchor="middle"
                fontFamily={FONT.tech}
                fontWeight={900}
                fontSize={54}
                fill={C.white}
                style={{filter: `drop-shadow(0 0 10px ${C.red})`}}
              >
                !
              </text>
            ))}
            {/* 数据比特 */}
            {new Array(D * D).fill(0).map((_, n) => {
              const i = n % D;
              const j = Math.floor(n / D);
              const dist = Math.hypot(i - 2, j - 2);
              const s = pop(f, fps, 10 + dist * 7, {damping: 10, stiffness: 160});
              const err = isErr(i, j);
              const corrected = f >= CORRECT && f < CORRECT + 30 && ((i === E1[0] && j === E1[1]) || (i === E2[0] && j === E2[1]));
              const col = err ? C.red : corrected ? C.cyan : C.white;
              const hit = (i === E1[0] && j === E1[1] ? impulse(f, [ERR1 + 3], 6) : 0) + (i === E2[0] && j === E2[1] ? impulse(f, [ERR2 + 3], 6) : 0);
              return <Orb key={n} id={`q${n}`} x={gx(i)} y={gy(j)} r={(err ? 26 : 20) * s * (1 + hit * 0.5)} color={col} halo={err || corrected ? 3.4 : 2.4} />;
            })}
            <Lightning x1={gx(1) - 40} y1={160} x2={gx(1)} y2={gy(2) - 30} start={ERR1} seed="se1" color={C.red} width={6} len={3} hold={9} />
            <Lightning x1={gx(2) + 60} y1={160} x2={gx(2)} y2={gy(2) - 30} start={ERR2} seed="se2" color={C.red} width={6} len={3} hold={9} />
            <Burst x={gx(1)} y={gy(2)} start={ERR1 + 3} seed="sb1" count={30} speed={24} colors={[C.red, C.white]} />
            <Burst x={gx(2)} y={gy(2)} start={ERR2 + 3} seed="sb2" count={30} speed={24} colors={[C.red, C.white]} />
            {/* 解码路径 */}
            {dec > 0 && <GlowPath d={partial()} color={C.gold} width={9} opacity={decVis} />}
            {dec > 0 && dec < 1 && (
              <Orb id="dhead" x={head[0]} y={head[1]} r={16} color={C.gold} halo={4} />
            )}
            <Shockwave x={gx(1.5)} y={gy(2)} start={CORRECT} color={C.green} maxR={700} />
            <Burst x={gx(1)} y={gy(2)} start={CORRECT} seed="c1" count={26} speed={22} colors={[C.cyan, C.green, C.white]} />
            <Burst x={gx(2)} y={gy(2)} start={CORRECT} seed="c2" count={26} speed={22} colors={[C.cyan, C.green, C.white]} />
          </Canvas>
        </div>
      )}

      {titleOut > 0 && (
        <div
          style={{
            position: 'absolute',
            top: CY - 110,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            opacity: titleOut * Math.min(1, titleS * 2),
            transform: `scale(${(2.4 - 1.4 * titleS) * (1 + (1 - titleOut) * 0.4)})`,
          }}
        >
          <GlitchText
            text="表面码"
            intensity={impulse(f, [2], 5) + 0.1}
            seed="sc"
            color={C.white}
            glow={C.violet}
            style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 170, letterSpacing: 24}}
          />
        </div>
      )}

      {/* 码距对比 */}
      {cmpVis > 0 && (
        <>
          <Canvas style={{opacity: cmpVis}}>
            {MINIS.map((m, k) => {
              const s = pop(f, fps, SCALE + 8 + k * 12, {damping: 12, stiffness: 150});
              const glow = impulse(f, [SCALE + 8 + k * 12], 8);
              const lo = pop(f, fps, LOGI + k * 8, {damping: 11, stiffness: 160});
              return (
                <g key={m.d}>
                  <MiniLattice d={m.d} s={40} cx={m.x} cy={690} appear={s} glow={glow} />
                  <path d={`M${m.x},${960}L${m.x},${960 + 70 * lo}`} stroke={alpha(C.gold, 0.6)} strokeWidth={3} strokeDasharray="6 6" />
                  <g opacity={lo}>
                    {new Array((m.d - 1) / 2).fill(0).map((_, r) => (
                      <circle
                        key={r}
                        cx={m.x}
                        cy={1120}
                        r={(52 + r * 18) * lo}
                        fill="none"
                        stroke={alpha(C.gold, 0.85 - r * 0.15)}
                        strokeWidth={5 - r}
                        strokeDasharray={r === 2 ? '10 6' : undefined}
                        style={{filter: `drop-shadow(0 0 8px ${C.gold})`}}
                      />
                    ))}
                    <Orb id={`lo${k}`} x={m.x} y={1120} r={30 * lo} color={C.gold} halo={3} />
                  </g>
                </g>
              );
            })}
          </Canvas>
          <div style={{position: 'absolute', inset: 0, opacity: cmpVis}}>
            {MINIS.map((m, k) => {
              const s = pop(f, fps, SCALE + 14 + k * 12);
              return (
                <div key={m.d} style={{position: 'absolute', left: m.x - 150, width: 300, top: 850, textAlign: 'center', opacity: s}}>
                  <div style={{fontFamily: FONT.tech, fontWeight: 900, fontSize: 44, color: C.white, textShadow: `0 0 18px ${C.violet}`}}>
                    d = {m.d}
                  </div>
                  <div style={{fontFamily: FONT.cn, fontWeight: 700, fontSize: 28, color: C.dim}}>{m.n} 个物理比特</div>
                </div>
              );
            })}
            <div
              style={{
                position: 'absolute',
                top: 1222,
                width: '100%',
                textAlign: 'center',
                fontFamily: FONT.cn,
                fontWeight: 900,
                fontSize: 34,
                letterSpacing: 4,
                color: C.gold,
                opacity: prog(f, LOGI + 20, LOGI + 34),
              }}
            >
              逻辑比特 · 防护越来越厚 →
            </div>
          </div>
        </>
      )}

      <Captions
        items={[
          {at: 40, to: CYCLE[0] - 2, text: '把量子比特铺成一张**棋盘**', color: C.violet},
          {at: CYCLE[0], to: ERR1, text: '每个格子都是一个**哨兵**\n不停检查周围比特的奇偶', color: C.cyan},
          {at: ERR1 + 2, to: ERR2, text: '一旦出错，相邻哨兵**亮起警报**', color: C.red},
          {at: ERR2 + 2, to: DECODE, text: '错误连成链，警报只出现在**两端**', color: C.red},
          {at: DECODE + 2, to: SCALE, text: '解码器**顺藤摸瓜**，整条链一起修好', color: C.gold},
          {at: SCALE + 4, to: LOGI, text: '棋盘越大（**码距**越大）\n越能扛住错误', color: C.violet},
          {at: LOGI + 2, to: 478, text: '几十上百个物理比特\n→ 守护 **1 个逻辑比特**', color: C.gold},
        ]}
      />
      <GlitchBars intensity={impulse(f, [ERR1 + 3, ERR2 + 3], 4) * 0.8} seed="s7" />
      <Flash opacity={impulse(f, [CORRECT], 5) * 0.35} color={C.green} />
    </SceneShell>
  );
};
