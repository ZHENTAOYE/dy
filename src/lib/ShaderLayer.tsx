import React, {useEffect, useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {createProgram, getGL, Program, releaseGL, setUniforms, UniformValue} from './gl';
import {NOISE_GLSL} from '../shaders/noise';

const VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Every fragment shader gets these helpers and uniforms for free.
const PRELUDE = `#version 300 es
precision highp float;
uniform vec2 uRes;      // canvas size in device pixels
uniform vec2 uView;     // layer size in CSS pixels
uniform float uScale;   // device pixels per CSS pixel
uniform float uTime;    // seconds since the layer mounted
out vec4 fragColor;
// Fragment position in CSS pixels with a top-left origin, matching SVG/HTML overlays.
vec2 pixel() { return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale; }
${NOISE_GLSL}
`;

type Props = {
  frag: string;
  uniforms?: Record<string, UniformValue>;
  // Render resolution relative to the composition (0.5 = half-res, upscaled by the browser).
  resolution?: number;
  style?: React.CSSProperties;
  time?: number;
};

export const ShaderLayer: React.FC<Props> = ({frag, uniforms = {}, resolution = 1, style, time}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{gl: WebGL2RenderingContext; prog: Program; frag: string} | null>(null);
  const cw = Math.round(width * resolution);
  const ch = Math.round(height * resolution);

  useLayoutEffect(() => {
    const canvas = ref.current!;
    if (!state.current || state.current.frag !== frag) {
      const gl = state.current?.gl ?? getGL(canvas);
      const prog = createProgram(gl, VS, PRELUDE + frag);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog.program, 'aPos');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      state.current = {gl, prog, frag};
    }
    const {gl, prog} = state.current;
    gl.viewport(0, 0, cw, ch);
    gl.useProgram(prog.program);
    gl.disable(gl.BLEND);
    setUniforms(gl, prog, {
      uRes: [cw, ch],
      uView: [width, height],
      uScale: cw / width,
      uTime: time ?? frame / fps,
      ...uniforms,
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
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
