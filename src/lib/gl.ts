export type UniformValue = number | number[] | Float32Array | {type: '1fv' | '2fv' | '3fv' | '4fv'; value: Float32Array | number[]};

export const getGL = (canvas: HTMLCanvasElement): WebGL2RenderingContext => {
  const gl = canvas.getContext('webgl2', {
    preserveDrawingBuffer: true,
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) throw new Error('WebGL2 not available');
  return gl;
};

const compileShader = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const numbered = src
      .split('\n')
      .map((l, i) => `${i + 1}: ${l}`)
      .join('\n');
    throw new Error(`Shader compile error: ${log}\n${numbered}`);
  }
  return s;
};

export type Program = {
  program: WebGLProgram;
  locs: Map<string, WebGLUniformLocation | null>;
};

export const createProgram = (gl: WebGL2RenderingContext, vs: string, fs: string): Program => {
  const program = gl.createProgram()!;
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
  }
  return {program, locs: new Map()};
};

const loc = (gl: WebGL2RenderingContext, p: Program, name: string) => {
  if (!p.locs.has(name)) p.locs.set(name, gl.getUniformLocation(p.program, name));
  return p.locs.get(name)!;
};

export const setUniforms = (gl: WebGL2RenderingContext, p: Program, uniforms: Record<string, UniformValue>) => {
  for (const name of Object.keys(uniforms)) {
    const l = loc(gl, p, name);
    if (!l) continue;
    const v = uniforms[name];
    if (typeof v === 'number') {
      gl.uniform1f(l, v);
    } else if (Array.isArray(v) || v instanceof Float32Array) {
      if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
      else if (v.length === 4) gl.uniform4f(l, v[0], v[1], v[2], v[3]);
      else if (v.length === 16) gl.uniformMatrix4fv(l, false, v);
      else throw new Error(`Unsupported uniform length for ${name}: ${v.length}`);
    } else {
      const arr = v.value instanceof Float32Array ? v.value : new Float32Array(v.value);
      if (v.type === '1fv') gl.uniform1fv(l, arr);
      if (v.type === '2fv') gl.uniform2fv(l, arr);
      if (v.type === '3fv') gl.uniform3fv(l, arr);
      if (v.type === '4fv') gl.uniform4fv(l, arr);
    }
  }
};

export const releaseGL = (gl: WebGL2RenderingContext | null) => {
  if (!gl) return;
  const ext = gl.getExtension('WEBGL_lose_context');
  ext?.loseContext();
};
