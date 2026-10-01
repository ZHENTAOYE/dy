import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Burst, Canvas, Flash, GlitchBars, GlowPath, Lightning, Orb, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag} from '../components/text';
import {CLAMP, easeOut, impulse, inOut, pop, prog} from '../lib/anim';
import {alpha, C, FONT, mix} from '../theme';

// ———————— A 段：纠缠编码电路 ————————
const WIRES = [560, 720, 880];
const X0 = 210;
const X1 = 960;
const G1 = 450;
const G2 = 680;
const PULSE_A = 26;
const PULSE_B = 120;
const OUT = 128;
const NOTCOPY = 162;
const PART_B = 214;

// ———————— B 段：奇偶校验 ————————
const DY = 740;
const DX = [230, 540, 850];
const AY = 960;
const AX = [385, 695];
const CHECK1 = PART_B + 26;
const ERR = PART_B + 70;
const CHECK2 = PART_B + 104;
const LOOKUP = PART_B + 136;
const FIXT = PART_B + 176;
const INSIGHT = PART_B + 232;
const SNAP = PART_B + 294;

const pulseX = (f: number) => interpolate(f, [PULSE_A, PULSE_B], [X0, X1], CLAMP);

const Ket: React.FC<{children: React.ReactNode; color?: string; size?: number}> = ({children, color = C.white, size = 56}) => (
  <span style={{fontFamily: FONT.math, fontSize: size, color}}>{children}</span>
);

export const S6Trick: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // —— A 段 ——
  const aVis = inOut(f, 0, PART_B + 6, 10);
  const wireIn = prog(f, 4, 24, easeOut);
  const px = pulseX(f);
  const g1Hit = PULSE_A + ((G1 - X0) / (X1 - X0)) * (PULSE_B - PULSE_A);
  const g2Hit = PULSE_A + ((G2 - X0) / (X1 - X0)) * (PULSE_B - PULSE_A);
  const outS = pop(f, fps, OUT, {damping: 11, stiffness: 160});
  const notS = pop(f, fps, NOTCOPY);
  const strike = prog(f, NOTCOPY + 14, NOTCOPY + 24, easeOut);

  // —— B 段 ——
  const bVis = inOut(f, PART_B - 4, 999, 12);
  const dPop = (i: number) => pop(f, fps, PART_B + 4 + i * 5);
  const errOn = f >= ERR + 3 && f < FIXT + 4;
  const fixed = f >= FIXT + 4;
  const dColor = (i: number) => (i === 1 && errOn ? C.red : i === 1 && fixed ? mix(C.green, C.cyan, prog(f, FIXT + 20, FIXT + 50)) : C.cyan);
  const check1 = prog(f, CHECK1, CHECK1 + 16);
  const check2 = prog(f, CHECK2, CHECK2 + 16);
  const res1 = f >= CHECK1 + 16 && f < ERR + 3;
  const res2 = f >= CHECK2 + 16 && f < FIXT + 4;
  const lookVis = inOut(f, LOOKUP, SNAP - 4, 10);
  const lookS = pop(f, fps, LOOKUP);
  const snapVis = inOut(f, SNAP, 999, 10);
  const insight = inOut(f, INSIGHT, SNAP - 2, 10);

  const syn = res2 ? '11' : res1 ? '00' : '';

  return (
    <SceneShell hits={[OUT, ERR + 3, FIXT + 4, SNAP + 34]} amp={22}>
      <ChapterTag n="05" title="量子纠错的妙招" en="THE QUANTUM TRICK" color={C.green} />

      {/* ============ A 段 ============ */}
      {aVis > 0 && (
        <>
          <Canvas style={{opacity: aVis}}>
            {WIRES.map((y, i) => {
              const lit = i === 0 ? X1 : Math.min(px, i === 1 ? (px > G1 ? px : G1) : px > G2 ? px : G2);
              const litStart = i === 0 ? X0 : i === 1 ? G1 : G2;
              return (
                <g key={i}>
                  <line x1={X0} x2={X0 + (X1 - X0) * wireIn} y1={y} y2={y} stroke={alpha(C.white, 0.35)} strokeWidth={3} />
                  {i === 0 && f >= PULSE_A && <GlowPath d={`M${X0},${y}L${px},${y}`} color={C.cyan} width={4} />}
                  {i > 0 && px > litStart && <GlowPath d={`M${litStart},${y}L${lit},${y}`} color={C.cyan} width={4} />}
                </g>
              );
            })}
            {[
              {x: G1, t: 1, hit: g1Hit},
              {x: G2, t: 2, hit: g2Hit},
            ].map((g, k) => {
              const s = pop(f, fps, 10 + k * 6);
              const fl = impulse(f, [g.hit], 6);
              const lit = f >= g.hit;
              const col = lit ? C.cyan : alpha(C.white, 0.75);
              return (
                <g key={k} opacity={s} transform={`translate(${g.x} 0) scale(${1 + fl * 0.25}) translate(${-g.x} 0)`}>
                  <line x1={g.x} x2={g.x} y1={WIRES[0]} y2={WIRES[g.t] + 38} stroke={col} strokeWidth={4} />
                  <circle cx={g.x} cy={WIRES[0]} r={15} fill={col} />
                  <circle cx={g.x} cy={WIRES[g.t]} r={38} fill={C.bg} stroke={col} strokeWidth={4} />
                  <line x1={g.x - 38} x2={g.x + 38} y1={WIRES[g.t]} y2={WIRES[g.t]} stroke={col} strokeWidth={4} />
                  <line x1={g.x} x2={g.x} y1={WIRES[g.t] - 38} y2={WIRES[g.t] + 38} stroke={col} strokeWidth={4} />
                  {fl > 0.01 && <circle cx={g.x} cy={WIRES[g.t]} r={38 + (1 - fl) * 60} fill="none" stroke={C.cyan} strokeWidth={6 * fl} />}
                </g>
              );
            })}
            {f >= PULSE_A && f <= PULSE_B + 6 &&
              WIRES.map((y, i) => (
                <Orb key={i} id={`pa${i}`} x={px} y={y} r={14} color={i === 0 || px > (i === 1 ? G1 : G2) ? C.cyan : C.white} halo={4} />
              ))}
            <Burst x={G1} y={WIRES[1]} start={Math.round(g1Hit)} seed="g1" count={24} speed={20} life={22} />
            <Burst x={G2} y={WIRES[2]} start={Math.round(g2Hit)} seed="g2" count={24} speed={20} life={22} />
            {/* 输出端的纠缠连线 */}
            {f >= OUT &&
              [0, 1].map((k) => {
                const ya = WIRES[k];
                const yb = WIRES[k + 1];
                const pts: string[] = [];
                for (let i = 0; i <= 30; i++) {
                  const y = ya + ((yb - ya) * i) / 30;
                  const x = 990 + Math.sin(i * 0.6 + f * 0.35) * 14 * Math.sin((i / 30) * Math.PI);
                  pts.push(`${i ? 'L' : 'M'}${x},${y}`);
                }
                return <GlowPath key={k} d={pts.join('')} color={C.magenta} width={3} opacity={outS} />;
              })}
          </Canvas>
          <div style={{position: 'absolute', inset: 0, opacity: aVis}}>
            {['|ψ⟩', '|0⟩', '|0⟩'].map((t, i) => (
              <div
                key={i}
                style={{position: 'absolute', right: 1080 - X0 + 22, top: WIRES[i] - 42, opacity: wireIn, textShadow: `0 0 16px ${C.cyan}`}}
              >
                <Ket color={i === 0 ? C.cyan : C.white}>{t}</Ket>
              </div>
            ))}
            {f >= OUT && (
              <div
                style={{
                  position: 'absolute',
                  top: 1010,
                  width: '100%',
                  textAlign: 'center',
                  opacity: Math.min(1, outS * 1.5),
                  transform: `scale(${0.5 + 0.5 * outS})`,
                  textShadow: `0 0 30px ${alpha(C.cyan, 0.8)}`,
                }}
              >
                <Ket size={86} color={C.cyan}>α</Ket>
                <Ket size={86}>|000⟩ + </Ket>
                <Ket size={86} color={C.magenta}>β</Ket>
                <Ket size={86}>|111⟩</Ket>
              </div>
            )}
            {f >= NOTCOPY && (
              <div
                style={{
                  position: 'absolute',
                  top: 1150,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 24,
                  opacity: Math.min(1, notS * 1.5),
                  transform: `translateY(${(1 - notS) * 30}px)`,
                }}
              >
                <div style={{position: 'relative', opacity: 0.7}}>
                  <Ket size={50}>≠ |ψ⟩|ψ⟩|ψ⟩</Ket>
                  <div
                    style={{
                      position: 'absolute',
                      left: -6,
                      top: '52%',
                      height: 6,
                      width: `${strike * 104}%`,
                      background: C.red,
                      boxShadow: `0 0 12px ${C.red}`,
                    }}
                  />
                </div>
                <div style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 40, color: C.red}}>不是三份拷贝！</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ B 段 ============ */}
      {bVis > 0 && (
        <>
          <Canvas style={{opacity: bVis}}>
            {/* 纠缠纽带 */}
            {[0, 1].map((k) => {
              const pts: string[] = [];
              for (let i = 0; i <= 40; i++) {
                const x = DX[k] + ((DX[k + 1] - DX[k]) * i) / 40;
                const y = DY + Math.sin(i * 0.5 - f * 0.3) * 12 * Math.sin((i / 40) * Math.PI);
                pts.push(`${i ? 'L' : 'M'}${x},${y}`);
              }
              return <GlowPath key={k} d={pts.join('')} color={C.magenta} width={2.5} opacity={0.35 + insight * 0.65} />;
            })}
            {/* 校验连线 */}
            {[
              [0, 0],
              [1, 0],
              [1, 1],
              [2, 1],
            ].map(([d, a], k) => {
              const x1 = DX[d];
              const x2 = AX[a];
              const p1 = check1 > 0 && check1 < 1 ? check1 : check2 > 0 && check2 < 1 ? check2 : -1;
              const bad = f >= CHECK2 && f < FIXT + 4;
              const lineCol = bad && f >= CHECK2 + 16 ? C.red : C.green;
              return (
                <g key={k} opacity={dPop(d)}>
                  <line x1={x1} y1={DY + 60} x2={x2} y2={AY - 44} stroke={alpha(C.white, 0.25)} strokeWidth={3} strokeDasharray="8 8" />
                  {p1 >= 0 && (
                    <Orb
                      id={`cp${k}`}
                      x={x1 + (x2 - x1) * p1}
                      y={DY + 60 + (AY - 44 - DY - 60) * p1}
                      r={9}
                      color={check2 > 0 ? (d === 1 ? C.red : C.cyan) : C.cyan}
                      halo={4}
                    />
                  )}
                  {(res1 || res2) && <GlowPath d={`M${x1},${DY + 60}L${x2},${AY - 44}`} color={lineCol} width={2.5} opacity={0.8} />}
                </g>
              );
            })}
            {DX.map((x, i) => {
              const s = dPop(i);
              const c = dColor(i);
              const hit = i === 1 ? impulse(f, [ERR + 3, FIXT + 4], 6) : 0;
              return <Orb key={i} id={`d${i}`} x={x} y={DY} r={58 * s * (1 + hit * 0.3)} color={c} halo={2.6} intensity={1 + hit} />;
            })}
            {AX.map((x, i) => {
              const s = pop(f, fps, PART_B + 18 + i * 5);
              const state = res2 ? 'bad' : res1 ? 'ok' : 'idle';
              const col = state === 'bad' ? C.red : state === 'ok' ? C.green : C.violet;
              const fl = impulse(f, [CHECK1 + 16, CHECK2 + 16], 6);
              return (
                <g key={i} transform={`translate(${x} ${AY}) rotate(45) scale(${s * (1 + fl * 0.25)})`}>
                  <rect x={-40} y={-40} width={80} height={80} rx={10} fill={alpha(col, 0.25)} stroke={col} strokeWidth={4} style={{filter: `drop-shadow(0 0 ${14 + fl * 20}px ${col})`}} />
                </g>
              );
            })}
            <Lightning x1={520} y1={250} x2={540} y2={DY - 60} start={ERR} seed="err6" color={C.red} width={7} len={3} hold={10} branches={3} />
            <Burst x={DX[1]} y={DY} start={ERR + 3} seed="e6" count={44} speed={30} colors={[C.red, C.white, C.orange]} />
            <Shockwave x={DX[1]} y={DY} start={ERR + 3} color={C.red} maxR={420} />
            {/* 修复光束 */}
            {f >= FIXT - 6 && f < FIXT + 18 && (
              <g opacity={1 - prog(f, FIXT + 6, FIXT + 18)}>
                <GlowPath d={`M540,240L540,${DY - 60}`} color={C.cyan} width={14 * prog(f, FIXT - 6, FIXT)} />
              </g>
            )}
            <Shockwave x={DX[1]} y={DY} start={FIXT + 4} color={C.green} maxR={520} />
            <Burst x={DX[1]} y={DY} start={FIXT + 4} seed="fx6" count={40} speed={28} colors={[C.green, C.white, C.cyan]} />
          </Canvas>

          <div style={{position: 'absolute', inset: 0, opacity: bVis}}>
            {/* 标签 */}
            <div
              style={{
                position: 'absolute',
                top: DY - 160,
                width: '100%',
                textAlign: 'center',
                fontFamily: FONT.cn,
                fontWeight: 700,
                fontSize: 30,
                letterSpacing: 8,
                color: alpha(C.cyan, 0.9),
                opacity: 1 - insight,
              }}
            >
              数 据 比 特
            </div>
            {insight > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: DY - 200,
                  width: '100%',
                  textAlign: 'center',
                  opacity: insight,
                  transform: `scale(${0.8 + 0.2 * insight})`,
                  textShadow: `0 0 30px ${alpha(C.magenta, 0.9)}`,
                }}
              >
                <Ket size={70} color={C.cyan}>α</Ket>
                <Ket size={70}>|000⟩ + </Ket>
                <Ket size={70} color={C.magenta}>β</Ket>
                <Ket size={70}>|111⟩</Ket>
                <span style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 40, color: C.green, marginLeft: 20}}>✓ 完好</span>
              </div>
            )}
            {DX.map((x, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x - 40,
                  width: 80,
                  top: DY - 30,
                  textAlign: 'center',
                  fontFamily: FONT.tech,
                  fontWeight: 900,
                  fontSize: 44,
                  color: C.bg,
                  opacity: dPop(i),
                }}
              >
                {i + 1}
              </div>
            ))}
            {AX.map((x, i) => {
              const state = res2 ? 'bad' : res1 ? 'ok' : 'idle';
              const col = state === 'bad' ? C.red : C.green;
              const s = pop(f, fps, state === 'bad' ? CHECK2 + 16 : CHECK1 + 16, {damping: 10, stiffness: 220});
              return (
                <div key={i} style={{position: 'absolute', left: x - 120, width: 240, top: AY + 66, textAlign: 'center'}}>
                  {state !== 'idle' ? (
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '6px 22px',
                        borderRadius: 12,
                        background: alpha(col, 0.2),
                        border: `2px solid ${col}`,
                        fontFamily: FONT.cn,
                        fontWeight: 900,
                        fontSize: 36,
                        color: col,
                        transform: `scale(${s})`,
                        boxShadow: `0 0 20px ${alpha(col, 0.6)}`,
                      }}
                    >
                      {state === 'bad' ? '✕ 不同' : '✓ 相同'}
                    </div>
                  ) : (
                    <div style={{fontFamily: FONT.cn, fontWeight: 700, fontSize: 28, color: alpha(C.violet, 0.9), letterSpacing: 4}}>
                      哨兵 {i + 1}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 症状查找表 */}
            {lookVis > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 1150,
                  left: 70,
                  width: 940,
                  display: 'flex',
                  gap: 16,
                  opacity: lookVis,
                  transform: `translateY(${(1 - lookS) * 40}px)`,
                }}
              >
                {[
                  ['00', '无错误'],
                  ['10', '1号错'],
                  ['11', '2号错'],
                  ['01', '3号错'],
                ].map(([s, m], i) => {
                  const on = s === '11' && f >= LOOKUP + 16;
                  const pulse = on ? 0.6 + 0.4 * Math.sin(f * 0.4) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 130,
                        borderRadius: 18,
                        border: `3px solid ${on ? C.gold : alpha(C.white, 0.25)}`,
                        background: on ? alpha(C.gold, 0.18) : 'rgba(8,10,26,0.7)',
                        boxShadow: on ? `0 0 ${30 + pulse * 30}px ${alpha(C.gold, 0.7)}` : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${on ? 1.06 : 1})`,
                      }}
                    >
                      <div style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 50, color: on ? C.gold : C.white, letterSpacing: 8}}>{s}</div>
                      <div style={{fontFamily: FONT.cn, fontWeight: 700, fontSize: 30, color: on ? C.gold : C.dim}}>{m}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {syn && f < LOOKUP && (
              <div
                style={{
                  position: 'absolute',
                  top: 1160,
                  width: '100%',
                  textAlign: 'center',
                  fontFamily: FONT.cn,
                  fontWeight: 700,
                  fontSize: 34,
                  color: C.dim,
                }}
              >
                警报读数{' '}
                <span style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 68, color: syn === '11' ? C.red : C.green, letterSpacing: 16}}>
                  {syn}
                </span>
              </div>
            )}

            {/* 测量把连续误差“掐”成离散 */}
            {snapVis > 0 && <SnapDial f={f} start={SNAP} opacity={snapVis} />}
          </div>
        </>
      )}

      <Captions
        items={[
          {at: 6, to: OUT, text: '妙招一：不复制，而是**纠缠**', color: C.magenta},
          {at: OUT + 2, to: PART_B - 2, text: '信息不属于任何一个比特，\n而是**三者共享**', color: C.magenta},
          {at: PART_B + 2, to: ERR + 2, text: '妙招二：只问“你们**一样吗**？”', color: C.green},
          {at: ERR + 3, to: CHECK2 + 12, text: '某个比特**出错了**！', color: C.red},
          {at: CHECK2 + 14, to: FIXT, text: '两个哨兵同时报警\n→ **锁定 2 号**', color: C.gold},
          {at: FIXT + 2, to: INSIGHT, text: '把它翻回来，**修复完成**', color: C.green},
          {at: INSIGHT + 2, to: SNAP - 2, text: '全程只问“关系”，\n从没碰过 **α 和 β**', color: C.cyan},
          {at: SNAP, to: 568, text: '测量还把连续误差“**掐**”成：\n要么没错，要么翻转', color: C.orange},
        ]}
      />
      <GlitchBars intensity={impulse(f, [ERR + 3], 5)} seed="t6" />
      <Flash opacity={impulse(f, [ERR + 2], 3) * 0.4} color={C.red} />
      <Flash opacity={impulse(f, [FIXT + 3], 4) * 0.35} color={C.cyan} />
    </SceneShell>
  );
};

/** 小表盘：指针在小角度晃动，测量瞬间“啪”地落到 0 */
const SnapDial: React.FC<{f: number; start: number; opacity: number}> = ({f, start, opacity}) => {
  const t = f - start;
  const SNAPF = 34;
  const wob = 14 + 5 * Math.sin(t * 0.5) + 3 * Math.sin(t * 1.3);
  const snap = prog(t, SNAPF, SNAPF + 5, easeOut);
  const ang = -90 + wob * (1 - snap);
  const a = (ang * Math.PI) / 180;
  const cx = 540;
  const cy = 1270;
  const R = 150;
  const fl = impulse(t, [SNAPF + 3], 8);
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <path d={`M${cx - R},${cy}A${R},${R} 0 0 1 ${cx + R},${cy}`} fill="none" stroke={alpha(C.white, 0.35)} strokeWidth={4} />
        <path d={`M${cx},${cy}L${cx},${cy - R - 16}`} stroke={alpha(C.green, 0.6)} strokeWidth={3} strokeDasharray="6 6" />
        <path d={`M${cx},${cy}L${cx},${cy + 12}`} stroke={alpha(C.red, 0.6)} strokeWidth={3} />
        <GlowPath d={`M${cx},${cy}L${cx + Math.cos(a) * (R - 8)},${cy + Math.sin(a) * (R - 8)}`} color={snap > 0.5 ? C.green : C.orange} width={6} />
        <circle cx={cx} cy={cy} r={11} fill={snap > 0.5 ? C.green : C.orange} />
        {fl > 0.01 && <circle cx={cx} cy={cy - R} r={20 + (1 - fl) * 80} fill="none" stroke={C.green} strokeWidth={8 * fl} />}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: cx - 470,
          top: cy - 110,
          width: 280,
          textAlign: 'right',
          fontFamily: FONT.cn,
          fontWeight: 900,
          fontSize: 40,
          color: C.orange,
          opacity: 1 - snap,
        }}
      >
        {`偏了 ${wob.toFixed(1)}°`}
      </div>
      <div
        style={{
          position: 'absolute',
          left: cx + 190,
          top: cy - 110,
          fontFamily: FONT.cn,
          fontWeight: 900,
          fontSize: 40,
          color: C.green,
          opacity: snap,
          transform: `scale(${0.6 + 0.4 * snap})`,
          textShadow: `0 0 20px ${C.green}`,
        }}
      >
        测量 → 归零
      </div>
    </div>
  );
};
