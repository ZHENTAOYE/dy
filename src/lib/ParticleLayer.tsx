import React, {useEffect, useLayoutEffect, useRef} from 'react';
import {useVideoConfig} from 'remotion';
import {createProgram, getGL, Program, releaseGL, setUniforms} from './gl';
import {CameraState} from './math';

// Each particle is an instanced screen-space quad. When a previous position is
// supplied the quad stretches into a motion streak, which gives the fast camera
// moves real speed without paying for multi-sample motion blur.
const VS = `#version 300 es
precision highp float;
in vec2 aCorner;
in vec3 aPos;
in vec3 aPrev;
in vec3 aColor;
in float aSize;
uniform mat4 uViewProj;
uniform mat4 uPrevViewProj;
uniform vec2 uRes;
uniform float uFocal, uSizeMul, uMinPx, uMaxPx, uNear, uPxMode, uIntensity, uStreakDim;
uniform vec2 uNearFade, uFarFade;
out vec2 vLocal;
out float vHL, vR;
out vec3 vColor;
void main() {
  vec4 c0 = uViewProj * vec4(aPos, 1.);
  vec4 c1 = uPrevViewProj * vec4(aPrev, 1.);
  if (c0.w < uNear) { gl_Position = vec4(9., 9., 9., 1.); return; }
  if (c1.w < uNear) c1 = c0;
  vec2 s0 = c0.xy / c0.w * .5 * uRes;
  vec2 s1 = c1.xy / c1.w * .5 * uRes;
  float rRaw = (uPxMode > .5 ? aSize : aSize * uFocal / c0.w) * uSizeMul;
  float r = clamp(rRaw, uMinPx, uMaxPx);
  float energy = min(1., (rRaw * rRaw) / (r * r));
  vec2 d = s1 - s0;
  float len = length(d);
  vec2 dir = len > .01 ? d / len : vec2(1., 0.);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hl = len * .5;
  vec2 local = vec2(aCorner.x * (hl + r), aCorner.y * r);
  vec2 p = (s0 + s1) * .5 + dir * local.x + nrm * local.y;
  gl_Position = vec4(p / (.5 * uRes), 0., 1.);
  vLocal = local;
  vHL = hl;
  vR = r;
  float fade = smoothstep(uNearFade.x, uNearFade.y, c0.w) * (1. - smoothstep(uFarFade.x, uFarFade.y, c0.w));
  float streak = mix(1., r / (r + hl), uStreakDim);
  vColor = aColor * uIntensity * energy * fade * streak;
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vLocal;
in float vHL, vR;
in vec3 vColor;
uniform float uHalo;
out vec4 fragColor;
void main() {
  float dx = max(abs(vLocal.x) - vHL, 0.);
  float d = length(vec2(dx, vLocal.y)) / vR;
  if (d > 1.) discard;
  float a = exp(-d * d * 6.) + uHalo * (1. - d) * (1. - d) * .25;
  fragColor = vec4(vColor * a, 0.);
}`;

// Tone-map pass for the HDR path: additive light accumulates in a float buffer, then a
// filmic curve rolls highlights off instead of clipping galaxy cores to flat white.
const TONE_VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * .5 + .5; gl_Position = vec4(aPos, 0., 1.); }`;
const TONE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uExposure;
out vec4 fragColor;
void main() {
  vec3 x = max(texture(uTex, vUv).rgb, 0.) * uExposure;
  vec3 c = clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.);
  fragColor = vec4(pow(c, vec3(1. / 2.2)), 0.);
}`;

export type ParticleSet = {
  positions: Float32Array;
  prev?: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  count?: number;
  blend?: 'add' | 'subtract';
  sizeMode?: 'world' | 'px';
  sizeMul?: number;
  minPx?: number;
  maxPx?: number;
  intensity?: number;
  halo?: number;
  streakDim?: number;
  nearFade?: [number, number];
  farFade?: [number, number];
};

type Buffers = {
  vao: WebGLVertexArrayObject;
  pos: WebGLBuffer;
  prev: WebGLBuffer;
  color: WebGLBuffer;
  size: WebGLBuffer;
  last: {colors?: Float32Array; sizes?: Float32Array};
};

type Props = {
  camera: CameraState;
  // Camera of the previous instant: particles streak along the camera's own motion too.
  prevCamera?: CameraState;
  sets: ParticleSet[];
  resolution?: number;
  style?: React.CSSProperties;
  // When set, render in HDR and tone-map with this exposure.
  hdr?: number;
};

type Hdr = {fb: WebGLFramebuffer; tex: WebGLTexture; prog: Program; quad: WebGLVertexArrayObject};

export const ParticleLayer: React.FC<Props> = ({camera, prevCamera, sets, resolution = 1, style, hdr}) => {
  const {width, height} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{gl: WebGL2RenderingContext; prog: Program; corner: WebGLBuffer; bufs: Buffers[]; hdr?: Hdr} | null>(null);
  const cw = Math.round(width * resolution);
  const ch = Math.round(height * resolution);

  useLayoutEffect(() => {
    if (!state.current) {
      const gl = getGL(ref.current!);
      const prog = createProgram(gl, VS, FS);
      const corner = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, corner);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      state.current = {gl, prog, corner, bufs: []};
    }
    const st = state.current;
    const {gl, prog} = st;
    const P = prog.program;
    if (hdr && !st.hdr) {
      gl.getExtension('EXT_color_buffer_float');
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, cw, ch, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const tprog = createProgram(gl, TONE_VS, TONE_FS);
      const quad = gl.createVertexArray()!;
      gl.bindVertexArray(quad);
      const qb = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, qb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(tprog.program, 'aPos');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      st.hdr = {fb, tex, prog: tprog, quad};
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdr && st.hdr ? st.hdr.fb : null);
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P);
    gl.enable(gl.BLEND);

    sets.forEach((set, i) => {
      if (!st.bufs[i]) {
        const vao = gl.createVertexArray()!;
        gl.bindVertexArray(vao);
        const mk = (name: string, n: number, divisor: number, buffer?: WebGLBuffer) => {
          const b = buffer ?? gl.createBuffer()!;
          const a = gl.getAttribLocation(P, name);
          gl.bindBuffer(gl.ARRAY_BUFFER, b);
          if (a >= 0) {
            gl.enableVertexAttribArray(a);
            gl.vertexAttribPointer(a, n, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(a, divisor);
          }
          return b;
        };
        mk('aCorner', 2, 0, st.corner);
        st.bufs[i] = {
          vao,
          pos: mk('aPos', 3, 1),
          prev: mk('aPrev', 3, 1),
          color: mk('aColor', 3, 1),
          size: mk('aSize', 1, 1),
          last: {},
        };
      }
      const b = st.bufs[i];
      gl.bindVertexArray(b.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos);
      gl.bufferData(gl.ARRAY_BUFFER, set.positions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.prev);
      gl.bufferData(gl.ARRAY_BUFFER, set.prev ?? set.positions, gl.DYNAMIC_DRAW);
      if (b.last.colors !== set.colors) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.color);
        gl.bufferData(gl.ARRAY_BUFFER, set.colors, gl.DYNAMIC_DRAW);
        b.last.colors = set.colors;
      }
      if (b.last.sizes !== set.sizes) {
        gl.bindBuffer(gl.ARRAY_BUFFER, b.size);
        gl.bufferData(gl.ARRAY_BUFFER, set.sizes, gl.DYNAMIC_DRAW);
        b.last.sizes = set.sizes;
      }
      if (set.blend === 'subtract') {
        gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
      } else {
        gl.blendEquation(gl.FUNC_ADD);
      }
      gl.blendFunc(gl.ONE, gl.ONE);
      setUniforms(gl, prog, {
        uViewProj: camera.viewProj,
        uPrevViewProj: (prevCamera ?? camera).viewProj,
        uRes: [cw, ch],
        uFocal: camera.focalPx * resolution,
        uSizeMul: set.sizeMul ?? 1,
        uMinPx: (set.minPx ?? 0.8) * resolution,
        uMaxPx: (set.maxPx ?? 400) * resolution,
        uNear: 1e-4,
        uPxMode: set.sizeMode === 'px' ? 1 : 0,
        uIntensity: set.intensity ?? 1,
        uHalo: set.halo ?? 0,
        uStreakDim: set.streakDim ?? 0.6,
        uNearFade: set.nearFade ?? [-1, 0],
        uFarFade: set.farFade ?? [1e20, 2e20],
      });
      const count = set.count ?? set.sizes.length;
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    });
    gl.bindVertexArray(null);
    if (hdr && st.hdr) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.BLEND);
      gl.useProgram(st.hdr.prog.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, st.hdr.tex);
      setUniforms(gl, st.hdr.prog, {uExposure: hdr});
      gl.uniform1i(gl.getUniformLocation(st.hdr.prog.program, 'uTex'), 0);
      gl.bindVertexArray(st.hdr.quad);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    }
  });

  useEffect(() => () => releaseGL(state.current?.gl ?? null), []);

  return (
    <canvas
      ref={ref}
      width={cw}
      height={ch}
      style={{position: 'absolute', left: 0, top: 0, width, height, ...style}}
    />
  );
};
