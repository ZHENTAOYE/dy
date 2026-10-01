import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Canvas, Flash, GlitchBars, GlowPath, Orb, Shockwave} from '../components/fx';
import {SceneShell} from '../components/SceneShell';
import {Captions, ChapterTag, GlitchText} from '../components/text';
import {CLAMP, easeOut, impulse, inOut, pop, prog} from '../lib/anim';
import {alpha, C, FONT} from '../theme';

// 图表区域
const X0 = 200;
const X1 = 960;
const Y0 = 400;
const Y1 = 1120;
// x：物理错误率 0.1% ~ 10%（对数）；y：逻辑错误率 1e-7 ~ 1（对数）
const PX = (p: number) => X0 + ((Math.log10(p) + 3) / 2) * (X1 - X0);
const PY = (q: number) => Y0 + (-Math.log10(q) / 7) * (Y1 - Y0);
const PTH = 0.01;

const CURVES = [
  {d: 3, c: C.cyan, at: 46},
  {d: 5, c: C.violet, at: 62},
  {d: 7, c: C.magenta, at: 78},
];
const logical = (d: number, p: number) => Math.min(0.5, 0.03 * (p / PTH) ** ((d + 1) / 2));

const TH = 104;
const BELOW = 152;
const ABOVE = 222;
const WILLOW = 266;
const BARS = WILLOW + 40;
const LIFE = WILLOW + 118;

export const S8Threshold: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const chartVis = interpolate(f, [WILLOW - 6, WILLOW + 6], [1, 0], CLAMP);
  const axes = prog(f, 4, 28, easeOut);
  const thS = prog(f, TH, TH + 14, easeOut);
  const below = prog(f, BELOW, BELOW + 14);
  const above = prog(f, ABOVE, ABOVE + 14);

  const curvePath = (d: number, t: number) => {
    const pts: string[] = [];
    const N = 60;
    for (let i = 0; i <= N * t; i++) {
      const lp = -3 + (i / N) * 2;
      const p = 10 ** lp;
      pts.push(`${i ? 'L' : 'M'}${PX(p).toFixed(1)},${PY(logical(d, p)).toFixed(1)}`);
    }
    return pts.join('');
  };

  // —— Willow ——
  const wVis = inOut(f, WILLOW, 999, 10);
  const chip = pop(f, fps, WILLOW + 4, {damping: 12, stiffness: 120});
  const LAMBDA = 2.14;
  const BARS_DATA = [
    {d: 3, v: 1},
    {d: 5, v: 1 / LAMBDA},
    {d: 7, v: 1 / (LAMBDA * LAMBDA)},
  ];
  const BX = [250, 540, 830];
  const BASE = 1220;
  const HMAX = 300;

  return (
    <SceneShell hits={[TH + 4, WILLOW + 6, BARS + 28]} amp={18}>
      <ChapterTag n="07" title="阈值定理" en="THRESHOLD THEOREM" color={C.green} />

      {chartVis > 0 && (
        <>
          <Canvas style={{opacity: chartVis}}>
            {/* 区域着色 */}
            <rect x={X0} y={Y0} width={(PX(PTH) - X0) * below} height={Y1 - Y0} fill={alpha(C.green, 0.1)} />
            <rect x={PX(PTH)} y={Y0} width={(X1 - PX(PTH)) * above} height={Y1 - Y0} fill={alpha(C.red, 0.12)} />
            {/* 网格 */}
            {[0.001, 0.01, 0.1].map((p) => (
              <line key={p} x1={PX(p)} x2={PX(p)} y1={Y0} y2={Y0 + (Y1 - Y0) * axes} stroke={alpha(C.white, 0.12)} strokeWidth={2} />
            ))}
            {[1, 1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7].map((q) => (
              <line key={q} x1={X0} x2={X0 + (X1 - X0) * axes} y1={PY(q)} y2={PY(q)} stroke={alpha(C.white, 0.08)} strokeWidth={2} />
            ))}
            <GlowPath d={`M${X0},${Y0}L${X0},${Y1}L${X0 + (X1 - X0) * axes},${Y1}`} color={C.blue} width={3} />
            {CURVES.map((cv) => {
              const t = prog(f, cv.at, cv.at + 30, easeOut);
              if (t <= 0) return null;
              return <GlowPath key={cv.d} d={curvePath(cv.d, t)} color={cv.c} width={5} />;
            })}
            {/* 阈值线 */}
            {thS > 0 && (
              <g>
                <GlowPath d={`M${PX(PTH)},${Y1}L${PX(PTH)},${Y1 - (Y1 - Y0) * thS}`} color={C.gold} width={4} dash="14 10" />
                <Orb id="thp" x={PX(PTH)} y={PY(0.03)} r={14 * thS} color={C.gold} halo={4} />
              </g>
            )}
            <Shockwave x={PX(PTH)} y={PY(0.03)} start={TH + 4} color={C.gold} maxR={500} />
            {/* 低于阈值：随码距下降 */}
            {below > 0 && (
              <g opacity={below}>
                {[3, 5].map((d, k) => {
                  const p = 0.0018;
                  const ya = PY(logical(d, p)) + 12;
                  const yb = PY(logical(d + 2, p)) - 12;
                  const g = prog(f, BELOW + 10 + k * 10, BELOW + 22 + k * 10, easeOut);
                  return (
                    <g key={d}>
                      <GlowPath d={`M${PX(p)},${ya}L${PX(p)},${ya + (yb - ya) * g}`} color={C.green} width={5} />
                      {g > 0.95 && <path d={`M${PX(p) - 14},${yb - 18}L${PX(p)},${yb + 2}L${PX(p) + 14},${yb - 18}Z`} fill={C.green} />}
                    </g>
                  );
                })}
              </g>
            )}
            {above > 0 && (
              <g opacity={above}>
                {[3, 5].map((d, k) => {
                  const p = 0.05;
                  const ya = PY(logical(d, p)) - 10;
                  const yb = PY(logical(d + 2, p)) + 10;
                  if (Math.abs(ya - yb) < 30) return null;
                  const g = prog(f, ABOVE + 6 + k * 8, ABOVE + 16 + k * 8, easeOut);
                  return <GlowPath key={d} d={`M${PX(p)},${ya}L${PX(p)},${ya + (yb - ya) * g}`} color={C.red} width={5} />;
                })}
              </g>
            )}
          </Canvas>
          <div style={{position: 'absolute', inset: 0, opacity: chartVis}}>
            {[
              [0.001, '0.1%'],
              [0.01, '1%'],
              [0.1, '10%'],
            ].map(([p, l]) => (
              <div
                key={l as string}
                style={{
                  position: 'absolute',
                  left: PX(p as number) - 80,
                  width: 160,
                  top: Y1 + 16,
                  textAlign: 'center',
                  fontFamily: FONT.cn,
                  fontWeight: 900,
                  fontSize: 30,
                  color: C.dim,
                  opacity: axes,
                }}
              >
                {l}
              </div>
            ))}
            <div style={{position: 'absolute', left: X0, width: X1 - X0, top: Y1 + 60, textAlign: 'center', fontFamily: FONT.cn, fontWeight: 700, fontSize: 32, color: C.white, opacity: axes}}>
              物理错误率 →
            </div>
            <div
              style={{
                position: 'absolute',
                left: X0 - 52,
                top: (Y0 + Y1) / 2,
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                fontFamily: FONT.cn,
                fontWeight: 700,
                fontSize: 32,
                color: C.white,
                whiteSpace: 'nowrap',
                opacity: axes,
              }}
            >
              逻辑错误率 →
            </div>
            {CURVES.map((cv) => {
              const t = prog(f, cv.at + 20, cv.at + 32);
              const y = PY(logical(cv.d, 0.001));
              return (
                <div
                  key={cv.d}
                  style={{
                    position: 'absolute',
                    left: X0 + 18,
                    top: y - 52,
                    fontFamily: FONT.tech,
                    fontWeight: 900,
                    fontSize: 30,
                    color: cv.c,
                    opacity: t,
                    textShadow: `0 0 14px ${cv.c}`,
                  }}
                >
                  d={cv.d}
                </div>
              );
            })}
            {thS > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: PX(PTH) - 200,
                  width: 400,
                  top: Y0 - 74,
                  textAlign: 'center',
                  fontFamily: FONT.cn,
                  fontWeight: 900,
                  fontSize: 46,
                  color: C.gold,
                  opacity: thS,
                  textShadow: `0 0 24px ${C.gold}`,
                }}
              >
                阈值 ≈ 1%
              </div>
            )}
            {below > 0 && (
              <div style={{position: 'absolute', left: X0 + 30, top: Y1 - 110, fontFamily: FONT.cn, fontWeight: 900, fontSize: 34, color: C.green, opacity: below, lineHeight: 1.3}}>
                ✓ 码越大
                <br />
                错误越少
              </div>
            )}
            {above > 0 && (
              <div style={{position: 'absolute', right: 1080 - X1 + 24, top: Y1 - 110, textAlign: 'right', fontFamily: FONT.cn, fontWeight: 900, fontSize: 34, color: C.red, opacity: above, lineHeight: 1.3}}>
                ✕ 越纠
                <br />
                越错
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== Willow ===== */}
      {wVis > 0 && (
        <>
          <Canvas style={{opacity: wVis}}>
            {/* 芯片 */}
            <g transform={`translate(540 560) scale(${chip}) rotate(${(1 - chip) * 30})`}>
              {new Array(4).fill(0).map((_, side) =>
                new Array(9).fill(0).map((__, k) => {
                  const o = -120 + k * 30;
                  const [x1, y1, x2, y2] =
                    side === 0 ? [o, -150, o, -175] : side === 1 ? [o, 150, o, 175] : side === 2 ? [-150, o, -175, o] : [150, o, 175, o];
                  return <line key={`${side}-${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={alpha(C.gold, 0.8)} strokeWidth={6} />;
                }),
              )}
              <rect x={-150} y={-150} width={300} height={300} rx={18} fill="#0b1030" stroke={C.gold} strokeWidth={4} style={{filter: `drop-shadow(0 0 22px ${alpha(C.gold, 0.7)})`}} />
              <rect x={-128} y={-128} width={256} height={256} rx={10} fill="none" stroke={alpha(C.cyan, 0.4)} strokeWidth={2} />
              {new Array(100).fill(0).map((_, n) => {
                const i = n % 10;
                const j = Math.floor(n / 10);
                const tw = 0.5 + 0.5 * Math.sin(f * 0.2 + i * 0.7 + j * 1.3);
                return <circle key={n} cx={-108 + i * 24} cy={-108 + j * 24} r={6} fill={(i + j) % 2 ? C.cyan : C.magenta} opacity={0.4 + tw * 0.6} />;
              })}
            </g>
            {/* 柱状图 */}
            <line x1={150} x2={930} y1={BASE} y2={BASE} stroke={alpha(C.white, 0.5)} strokeWidth={3} />
            {BARS_DATA.map((b, k) => {
              const g = pop(f, fps, BARS + k * 12, {damping: 14, stiffness: 110});
              const h = HMAX * b.v * g;
              const col = [C.cyan, C.violet, C.green][k];
              return (
                <g key={b.d}>
                  <defs>
                    <linearGradient id={`bar${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={col} />
                      <stop offset="100%" stopColor={alpha(col, 0.15)} />
                    </linearGradient>
                  </defs>
                  <rect x={BX[k] - 56} y={BASE - h} width={112} height={h} rx={10} fill={`url(#bar${k})`} stroke={col} strokeWidth={3} style={{filter: `drop-shadow(0 0 16px ${alpha(col, 0.8)})`}} />
                </g>
              );
            })}
            <Shockwave x={BX[2]} y={BASE - HMAX / (LAMBDA * LAMBDA)} start={BARS + 28} color={C.green} maxR={300} />
          </Canvas>
          <div style={{position: 'absolute', inset: 0, opacity: wVis}}>
            <div
              style={{
                position: 'absolute',
                top: 760,
                width: '100%',
                textAlign: 'center',
                opacity: Math.min(1, chip * 1.4),
                transform: `translateY(${(1 - chip) * 30}px)`,
              }}
            >
              <span style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 44, color: C.gold, letterSpacing: 4}}>2024 · </span>
              <span style={{fontFamily: FONT.tech, fontWeight: 900, fontSize: 40, color: C.gold, letterSpacing: 4}}>GOOGLE </span>
              <span style={{fontFamily: FONT.tech, fontWeight: 900, fontSize: 52, color: C.white, letterSpacing: 6, textShadow: `0 0 20px ${C.gold}`}}>
                WILLOW
              </span>
            </div>
            {BARS_DATA.map((b, k) => {
              const g = pop(f, fps, BARS + k * 12, {damping: 14, stiffness: 110});
              return (
                <div key={b.d} style={{position: 'absolute', left: BX[k] - 100, width: 200, top: BASE + 14, textAlign: 'center', opacity: g}}>
                  <div style={{fontFamily: FONT.tech, fontWeight: 900, fontSize: 36, color: C.white}}>d={b.d}</div>
                </div>
              );
            })}
            {[0, 1].map((k) => {
              const t = pop(f, fps, BARS + 20 + k * 12);
              return (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: (BX[k] + BX[k + 1]) / 2 - 70,
                    width: 140,
                    top: BASE - (HMAX * (BARS_DATA[k].v + BARS_DATA[k + 1].v)) / 2 - 40,
                    textAlign: 'center',
                    fontFamily: FONT.tech,
                    fontWeight: 900,
                    fontSize: 32,
                    color: C.gold,
                    opacity: t,
                    transform: `scale(${t})`,
                    textShadow: `0 0 14px ${C.gold}`,
                  }}
                >
                  ÷2.14
                </div>
              );
            })}
            {f >= BARS + 28 && (
              <div
                style={{
                  position: 'absolute',
                  left: BX[2] - 110,
                  width: 220,
                  top: BASE - HMAX / (LAMBDA * LAMBDA) - 76,
                  textAlign: 'center',
                  transform: `scale(${pop(f, fps, BARS + 28, {damping: 9, stiffness: 220})})`,
                }}
              >
                <GlitchText
                  text="0.143%"
                  intensity={impulse(f, [BARS + 28], 4)}
                  seed="w"
                  color={C.green}
                  glow={C.green}
                  style={{fontFamily: FONT.cn, fontWeight: 900, fontSize: 46, display: 'inline-block'}}
                />
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: 850,
                width: '100%',
                textAlign: 'center',
                fontFamily: FONT.cn,
                fontWeight: 700,
                fontSize: 30,
                color: C.dim,
                opacity: prog(f, BARS, BARS + 12),
              }}
            >
              每轮纠错的逻辑错误率
            </div>
          </div>
        </>
      )}

      <Captions
        items={[
          {at: 6, to: 76, text: '但这一切，有个**前提**', color: C.gold},
          {at: 78, to: BELOW, text: '码越大，曲线越陡\n所有曲线交于一点：**阈值**', color: C.gold},
          {at: BELOW + 2, to: ABOVE, text: '低于阈值：码越大，错误**指数级下降**', color: C.green},
          {at: ABOVE + 2, to: WILLOW, text: '高于阈值：**越纠越错**', color: C.red},
          {at: WILLOW + 4, to: BARS + 30, text: '2024年，谷歌 Willow 芯片\n做到了**低于阈值**', color: C.gold},
          {at: BARS + 32, to: LIFE, text: '码距每增加 2，错误率**降低一半以上**', color: C.green},
          {at: LIFE + 2, to: 448, text: '逻辑比特的寿命，\n达到最好物理比特的 **2.4 倍**', color: C.cyan},
        ]}
      />
      <GlitchBars intensity={impulse(f, [WILLOW + 6], 4) * 0.7} seed="t8" />
      <Flash opacity={impulse(f, [WILLOW + 4], 4) * 0.4} />
    </SceneShell>
  );
};
