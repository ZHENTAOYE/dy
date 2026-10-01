import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {alpha, C, H, W} from '../theme';

const GAP = 60;

/** 全局背景：深空渐变 + 量子点阵波纹 + 星尘 */
export const Background: React.FC<{tintA: string; tintB: string; danger: number}> = ({
  tintA,
  tintB,
  danger,
}) => {
  const frame = useCurrentFrame();

  const stars = useMemo(
    () =>
      new Array(150).fill(0).map((_, i) => ({
        x: random(`sx${i}`) * W,
        y: random(`sy${i}`) * H,
        r: 0.7 + random(`sr${i}`) ** 3 * 2.8,
        sp: 0.2 + random(`ss${i}`) * 0.9,
        tw: random(`st${i}`) * Math.PI * 2,
      })),
    [],
  );

  const dots = useMemo(() => {
    const out: {x: number; y: number; d: number}[] = [];
    for (let j = 0; j * GAP < H + GAP; j++) {
      for (let i = 0; i * GAP < W + GAP; i++) {
        const x = i * GAP + (j % 2 ? GAP / 2 : 0);
        const y = j * GAP;
        out.push({x, y, d: Math.hypot(x - W / 2, y - H * 0.42)});
      }
    }
    return out;
  }, []);

  const dotColor = danger > 0.5 ? C.red : tintA;

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(110% 60% at 50% 38%, ${alpha(tintA, 0.3)} 0%, ${alpha(tintA, 0.08)} 45%, transparent 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 45% at 50% 108%, ${alpha(tintB, 0.32)} 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 40% at 50% -5%, ${alpha(tintB, 0.18)} 0%, transparent 70%)`,
        }}
      />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {dots.map((p, i) => {
          const wave = Math.sin(p.d * 0.012 - frame * 0.07);
          const o = 0.05 + Math.max(0, wave) ** 6 * 0.35;
          return <circle key={i} cx={p.x} cy={p.y} r={1.6 + Math.max(0, wave) ** 6 * 1.4} fill={dotColor} opacity={o} />;
        })}
        {stars.map((s, i) => {
          const y = (((s.y - frame * s.sp) % H) + H) % H;
          const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame * 0.12 + s.tw));
          return <circle key={`s${i}`} cx={s.x} cy={y} r={s.r} fill={C.white} opacity={tw * 0.7} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
