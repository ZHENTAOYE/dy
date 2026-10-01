export type V3 = [number, number, number];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Normalized progress of x through [a, b], clamped.
export const prog = (x: number, a: number, b: number) => clamp((x - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInExpo = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
// Interpolate in log space: ideal for zooms across orders of magnitude.
export const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Smooth deterministic 1D noise for camera shake and flicker.
const h1 = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
export const noise1 = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(h1(i), h1(i + 1), u) * 2 - 1;
};

// ---- Column-major 4x4 matrices (gl-matrix layout) ----
export type M4 = Float32Array;

export const perspective = (fovYdeg: number, aspect: number, near: number, far: number): M4 => {
  const f = 1 / Math.tan((fovYdeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
};

export const lookAt = (eye: V3, target: V3, up: V3): M4 => {
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  const m = new Float32Array(16);
  m[0] = x[0];
  m[1] = y[0];
  m[2] = z[0];
  m[4] = x[1];
  m[5] = y[1];
  m[6] = z[1];
  m[8] = x[2];
  m[9] = y[2];
  m[10] = z[2];
  m[12] = -dot(x, eye);
  m[13] = -dot(y, eye);
  m[14] = -dot(z, eye);
  m[15] = 1;
  return m;
};

export const mul4 = (a: M4, b: M4): M4 => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
};

export type Camera = {
  eye: V3;
  target: V3;
  up?: V3;
  fov?: number; // vertical, degrees
  near?: number;
  far?: number;
};

export type CameraState = {
  viewProj: M4;
  focalPx: number; // pixels per world unit at depth 1
  width: number;
  height: number;
  // Project a world point to CSS pixels (top-left origin). depth <= 0 means behind the camera.
  project: (p: V3) => {x: number; y: number; depth: number};
};

export const makeCamera = (cam: Camera, width: number, height: number): CameraState => {
  const fov = cam.fov ?? 50;
  const near = cam.near ?? 0.01;
  const far = cam.far ?? 1e7;
  const proj = perspective(fov, width / height, near, far);
  const view = lookAt(cam.eye, cam.target, cam.up ?? [0, 1, 0]);
  const viewProj = mul4(proj, view);
  const focalPx = height / 2 / Math.tan((fov * Math.PI) / 360);
  const project = (p: V3) => {
    const m = viewProj;
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return {x: (x / w) * 0.5 * width + width / 2, y: (-y / w) * 0.5 * height + height / 2, depth: w};
  };
  return {viewProj, focalPx, width, height, project};
};

// Orbit camera helper: spherical coordinates around a target.
export const orbit = (target: V3, dist: number, yawDeg: number, pitchDeg: number): V3 => {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  return [
    target[0] + dist * Math.cos(pitch) * Math.sin(yaw),
    target[1] + dist * Math.sin(pitch),
    target[2] + dist * Math.cos(pitch) * Math.cos(yaw),
  ];
};
