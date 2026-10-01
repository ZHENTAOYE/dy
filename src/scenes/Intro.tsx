import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Sequence, useCurrentFrame} from 'remotion';
import {ParticleLayer} from '../lib/ParticleLayer';
import {ShaderLayer} from '../lib/ShaderLayer';
import {NEBULA_FRAG} from '../shaders/nebula';
import {StarField} from '../components/StarField';
import {Line, useLayout} from '../components/Text';
import {Flash, Shake, Vignette} from '../components/Fx';
import {LATIN, SANS, SERIF} from '../fonts';
import {S} from '../script';
import {easeInOut, easeOut, lerp, makeCamera, prog, smoothstep} from '../lib/math';
import {gauss, mulberry32} from '../lib/random';
import {INTRO_DUR, TITLE_AT, GATHER_FROM} from '../timing';


const FONT_SPEC = `900 400px "Noto Serif SC"`;

// Wait until the title font is actually usable before sampling glyph pixels.
const useFontReady = () => {
  const [ready, setReady] = useState(() => document.fonts.check(FONT_SPEC, S.intro.title));
  const [handle] = useState(() => (ready ? null : delayRender('title font')));
  useEffect(() => {
    if (ready) return;
    document.fonts.load(FONT_SPEC, S.intro.title).then(() => {
      setReady(true);
      if (handle !== null) continueRender(handle);
    });
  }, [ready, handle]);
  return ready;
};

export const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const {width: W, height: H, portrait, S: M} = useLayout();
  const ready = useFontReady();
  const titleY = (portrait ? 0.42 : 0.44) * H;
  const glyphH = (portrait ? 0.34 : 0.3) * M;

  // Sample the title glyphs into target points.
  const parts = useMemo(() => {
    if (!ready) return null;
    const cw = 1200;
    const ch = 520;
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.font = FONT_SPEC;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(S.intro.title.split('').join(' '), cw / 2, ch / 2 + 20);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    const rnd = mulberry32(8);
    const targets: number[] = [];
    for (let y = 0; y < ch; y += 3) {
      for (let x = 0; x < cw; x += 3) {
        if (data[(y * cw + x) * 4 + 3] > 140 && rnd() < 0.9) targets.push(x + rnd() * 2, y + rnd() * 2);
      }
    }
    const n = targets.length / 2;
    const k = glyphH / 400;
    const tgt = new Float32Array(n * 3);
    const src = new Float32Array(n * 3);
    const delay = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      tgt[i * 3] = W / 2 + (targets[i * 2] - cw / 2) * k;
      tgt[i * 3 + 1] = titleY + (targets[i * 2 + 1] - ch / 2) * k;
      tgt[i * 3 + 2] = 0;
      // start scattered in a deep cloud around and in front of the camera
      const a = rnd() * Math.PI * 2;
      const rr = (0.4 + rnd()) * Math.max(W, H);
      src[i * 3] = W / 2 + Math.cos(a) * rr;
      src[i * 3 + 1] = H / 2 + Math.sin(a) * rr;
      src[i * 3 + 2] = -Math.abs(gauss(rnd)) * 1400 - 200;
      delay[i] = rnd();
      const warm = rnd();
      const b = 0.7 + rnd() * 0.8;
      col.set(warm < 0.6 ? [0.85 * b, 0.9 * b, 1 * b] : [1 * b, 0.85 * b, 0.6 * b], i * 3);
      size[i] = 1.3 + rnd() * 1.3;
    }
    return {n, tgt, src, delay, col, size};
  }, [ready, W, H, titleY, glyphH]);

  // Screen-aligned camera: world x/y equal CSS pixels on the z = 0 plane.
  const fov = 50;
  const dist = H / 2 / Math.tan((fov * Math.PI) / 360);
  // Looking down +z with y flipped so that world x/y map straight onto screen x/y.
  const cam = makeCamera({eye: [W / 2, H / 2, -dist], target: [W / 2, H / 2, 0], up: [0, -1, 0], fov, near: 1, far: 1e5}, W, H);

  const pos = useMemo(() => {
    if (!parts) return null;
    const at = (fr: number, out: Float32Array) => {
      for (let i = 0; i < parts.n; i++) {
        const start = GATHER_FROM + parts.delay[i] * 34;
        const t = easeInOut(prog(fr, start, start + 34));
        // after the title forms it breathes slightly
        const breathe = fr > TITLE_AT ? Math.sin(fr * 0.08 + i) * 0.6 : 0;
        for (let k = 0; k < 3; k++) out[i * 3 + k] = lerp(parts.src[i * 3 + k], parts.tgt[i * 3 + k], t) + (k === 2 ? breathe * 3 : 0);
      }
      return out;
    };
    return {p: at(f, new Float32Array(parts.n * 3)), q: at(f - 0.6, new Float32Array(parts.n * 3))};
  }, [parts, f]);

  const gather = smoothstep(GATHER_FROM, GATHER_FROM + 20, f);
  const burst = Math.exp(-Math.max(f - TITLE_AT, 0) / 25) * (f >= TITLE_AT ? 1 : 0);
  const ring = f >= TITLE_AT ? easeOut(prog(f, TITLE_AT, TITLE_AT + 40)) : 0;
  const neb = smoothstep(TITLE_AT - 10, TITLE_AT + 40, f);
  const outFade = 1 - smoothstep(INTRO_DUR - 22, INTRO_DUR, f);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake impacts={[{at: TITLE_AT, power: 30, decay: 14}]}>
        <AbsoluteFill style={{opacity: outFade}}>
          <StarField seed={3} yaw={-0.4 + f * 0.0006} pitch={0.25} roll={0.2} brightness={smoothstep(0, 70, f) * 0.9} />
          <ShaderLayer
            frag={NEBULA_FRAG}
            resolution={0.5}
            uniforms={{
              uC1: [0.18, 0.12, 0.42],
              uC2: [0.15, 0.45, 0.85],
              uC3: [0.9, 0.35, 0.45],
              uIntensity: 0.12 + 0.9 * neb + burst * 0.8,
              uSeed: 4.2,
              uZoom: 1.6 - 0.25 * neb + f * 0.0006,
              uDrift: [0.2, 0.1],
            }}
          />
          {pos && parts ? (
            <ParticleLayer
              camera={cam}
              hdr={1}
              sets={[
                {
                  positions: pos.p,
                  prev: pos.q,
                  colors: parts.col,
                  sizes: parts.size,
                  sizeMode: 'px',
                  intensity: gather * (1.1 + burst * 1.5) * (1 - 0.35 * smoothstep(TITLE_AT + 10, TITLE_AT + 50, f)),
                  minPx: 0.9,
                  maxPx: 6,
                  streakDim: 0.25,
                  halo: 0.6,
                },
              ]}
            />
          ) : null}
          {/* shockwave ring from the title impact */}
          {ring > 0 && ring < 1 ? (
            <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
              <circle cx={W / 2} cy={titleY} r={ring * Math.max(W, H) * 0.9} fill="none" stroke={`rgba(200,220,255,${0.7 * (1 - ring)})`} strokeWidth={30 * (1 - ring) + 2} style={{filter: 'blur(6px)'}} />
              <circle cx={W / 2} cy={titleY} r={ring * Math.max(W, H) * 0.6} fill="none" stroke={`rgba(255,220,180,${0.5 * (1 - ring)})`} strokeWidth={10 * (1 - ring) + 1} />
            </svg>
          ) : null}
          {/* crisp glyphs fade in over the particles for legibility */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: W,
              top: titleY,
              transform: `translateY(-50%) scale(${1 + 0.04 * (1 - smoothstep(TITLE_AT, TITLE_AT + 60, f))})`,
              textAlign: 'center',
              fontFamily: SERIF,
              fontWeight: 900,
              fontSize: glyphH,
              lineHeight: 1,
              color: '#fff',
              opacity: smoothstep(TITLE_AT - 2, TITLE_AT + 22, f) * 0.92,
              letterSpacing: 0,
              textShadow: `0 0 ${0.04 * M}px rgba(170,200,255,0.9), 0 0 ${0.12 * M}px rgba(120,150,255,0.6)`,
              whiteSpace: 'pre',
            }}
          >
            {S.intro.title.split('').join(' ')}
          </div>
          <div
            style={{
              position: 'absolute',
              width: W,
              top: titleY + glyphH * 0.68,
              textAlign: 'center',
              fontFamily: LATIN,
              fontWeight: 300,
              fontSize: 0.045 * M,
              color: '#dfe7ff',
              letterSpacing: `${lerp(1.6, 0.8, easeOut(prog(f, TITLE_AT + 4, TITLE_AT + 60)))}em`,
              paddingLeft: '0.8em',
              whiteSpace: 'nowrap',
              opacity: smoothstep(TITLE_AT + 4, TITLE_AT + 28, f),
            }}
          >
            {S.intro.titleEn}
          </div>
          <div
            style={{
              position: 'absolute',
              width: W,
              top: titleY + glyphH * 0.68 + 0.1 * M,
              textAlign: 'center',
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: 0.036 * M,
              color: 'rgba(230,236,255,0.85)',
              letterSpacing: '0.3em',
              opacity: smoothstep(TITLE_AT + 26, TITLE_AT + 50, f),
            }}
          >
            {S.intro.tagline}
          </div>
        </AbsoluteFill>
      </Shake>
      <Vignette strength={0.7} />
      <Sequence from={12} durationInFrames={92}>
        <Line text={S.intro.l1} dur={92} pos={portrait ? 0.44 : 0.44} size={0.05} font="serif" weight={500} stagger={2.2} />
      </Sequence>
      <Sequence from={44} durationInFrames={60}>
        <Line text={S.intro.l2} dur={60} pos={portrait ? 0.51 : 0.54} size={0.05} font="serif" weight={500} stagger={2.2} />
      </Sequence>
      <Sequence from={108} durationInFrames={52}>
        <Line text={S.intro.l3} dur={52} pos="center" size={0.064} font="serif" weight={700} stagger={2.5} />
      </Sequence>
      <Flash at={TITLE_AT} rise={3} decay={16} peak={0.85} />
    </AbsoluteFill>
  );
};
