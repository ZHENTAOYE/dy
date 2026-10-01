// Shared GLSL helpers: hashing, value noise, fbm, rotations and tone mapping.
export const NOISE_GLSL = /* glsl */ `
#define PI 3.14159265359
#define TAU 6.28318530718

float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3. - 2. * f);
  float a = hash13(i), b = hash13(i + vec3(1, 0, 0)), c = hash13(i + vec3(0, 1, 0)), d = hash13(i + vec3(1, 1, 0));
  float e = hash13(i + vec3(0, 0, 1)), f1 = hash13(i + vec3(1, 0, 1)), g = hash13(i + vec3(0, 1, 1)), h = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f1, u.x), mix(g, h, u.x), u.y), u.z);
}

float fbm2(vec2 p, int oct) {
  float v = 0., a = .5;
  mat2 r = mat2(.8, .6, -.6, .8);
  for (int i = 0; i < 10; i++) { if (i >= oct) break; v += a * noise2(p); p = r * p * 2.03 + 17.1; a *= .5; }
  return v;
}

float fbm3(vec3 p, int oct) {
  float v = 0., a = .5;
  for (int i = 0; i < 10; i++) { if (i >= oct) break; v += a * noise3(p); p = p * 2.02 + vec3(13.7, 7.3, 3.1); a *= .5; }
  return v;
}

// Ridged fbm: sharp filaments, good for nebulae and plasma.
float ridged3(vec3 p, int oct) {
  float v = 0., a = .5;
  for (int i = 0; i < 10; i++) { if (i >= oct) break; float n = 1. - abs(noise3(p) * 2. - 1.); v += a * n * n; p = p * 2.03 + vec3(5.1, 1.7, 9.2); a *= .5; }
  return v;
}

// Distance to nearest cell point (F1) for granulation / cellular textures.
float voronoi2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(x, y);
    vec2 o = hash22(i + g);
    vec2 r = g + o - f;
    d = min(d, dot(r, r));
  }
  return sqrt(d);
}

mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }

// Filmic tone map (ACES approximation) keeps blown-out highlights pleasant.
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

// Blackbody-ish ramp: t in [0,1] from deep red to blue-white.
vec3 starColor(float t) {
  return mix(mix(vec3(1., .35, .12), vec3(1., .85, .6), smoothstep(0., .5, t)), vec3(.7, .82, 1.), smoothstep(.5, 1., t));
}

// Procedural background stars for a direction (used by shaders that need lensed/refracted stars).
vec3 starsDir(vec3 d, float density) {
  vec3 col = vec3(0);
  for (int l = 0; l < 3; l++) {
    float sc = 90. + float(l) * 110.;
    vec3 p = d * sc;
    vec3 id = floor(p);
    vec3 h = hash33(id + float(l) * 31.);
    if (h.x < density) {
      vec3 c = id + .2 + .6 * hash33(id + 7.);
      float dist = length(p - c);
      float b = pow(h.y, 6.) * 3. + .15;
      col += starColor(h.z) * b * exp(-dist * dist * 40.);
    }
  }
  return col;
}
`;
