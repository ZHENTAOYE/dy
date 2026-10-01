// Up to 8 stars as boiling discs with limb darkening and glow; tiny ones collapse to glowing points.
export const STARS_FRAG = /* glsl */ `
uniform vec4 uStar[8];   // xy = center (CSS px), z = radius (px), w = temperature 0..1
uniform float uSeed[8];
uniform float uCount, uExposure, uGlowMul;

vec3 tempColor(float t) {
  vec3 c = mix(vec3(1., .22, .05), vec3(1., .55, .2), smoothstep(0., .25, t));
  c = mix(c, vec3(1., .86, .6), smoothstep(.25, .55, t));
  c = mix(c, vec3(.92, .95, 1.), smoothstep(.55, .8, t));
  return mix(c, vec3(.62, .75, 1.), smoothstep(.8, 1., t));
}

void main() {
  vec2 p = pixel();
  vec3 col = vec3(0);
  float alpha = 0.;
  float S = min(uView.x, uView.y);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uCount) break;
    vec4 st = uStar[i];
    float R = max(st.z, .001);
    vec2 q = (p - st.xy) / R;
    float d = length(q);
    vec3 tc = tempColor(st.w);
    float giant = smoothstep(.3, .0, st.w); // red giants get huge convection cells
    if (d < 1. && R > 1.) {
      vec3 n = vec3(q, sqrt(1. - d * d));
      vec3 pn = rotY(n, uTime * .03 + uSeed[i]);
      float cells = 1. - voronoi2(pn.xy * mix(14., 4.5, giant) / (1.2 - n.z * .3) + uSeed[i] * 7. + uTime * .05);
      float turb = fbm3(pn * mix(5., 2.5, giant) + uSeed[i] + vec3(0, 0, uTime * .06), 5);
      float limb = pow(n.z, mix(.45, .8, giant));
      float v = (.55 + .5 * turb + .35 * cells * mix(.5, 1.2, giant)) * limb;
      v *= 1. - giant * smoothstep(.55, .75, fbm3(pn * 3. + 9. + uSeed[i], 4)) * .5;
      vec3 c = tc * v * 1.05;
      float a = smoothstep(1., 1. - 1.5 / R, d);
      col = col * (1. - a) + c * a;
      alpha = max(alpha, a);
    }
    // glow: scales with the star but never smaller than a visible point
    float gR = clamp(R, S * .004, S * .05);
    float dd = length(p - st.xy);
    float glow = exp(-max(dd - R, 0.) / (gR * .15 + 2.)) * .7 + exp(-max(dd - R, 0.) / (gR * .9 + 8.)) * .18;
    glow *= uGlowMul;
    if (R < 1.5) glow += exp(-dd * dd / 6.) * 2.;
    col += tc * glow * (1. - alpha * .7);
  }
  col = aces(col * uExposure);
  fragColor = vec4(pow(col, vec3(1. / 2.2)), alpha);
}`;

// Supernova: a blinding core and an expanding shell of turbulent, glowing filaments.
export const NOVA_FRAG = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius, uAge, uFlash, uCore, uExposure;

void main() {
  vec2 p = pixel();
  float S = min(uView.x, uView.y);
  vec2 q = (p - uCenter) / max(uRadius, 1.);
  float r = length(q);
  float ang = atan(q.y, q.x);
  vec3 col = vec3(0);
  // pseudo-3D direction so the filaments look like a sphere seen from outside
  vec3 dir = normalize(vec3(q, sqrt(max(0., 1. - min(r, 1.) * min(r, 1.))) + .05));
  float t = uAge;
  float warp = fbm3(dir * 3. + t * .5, 4);
  float fil = ridged3(dir * 5. + vec3(warp * 2., t * .3, 0.), 6);
  float shellW = .1 + .25 * t;
  float shell = exp(-pow((r - 1.) / shellW, 2.));
  float body = smoothstep(1.08, .2, r) * (.25 + .75 * smoothstep(.3, .95, r));
  float dens = (shell * 1.2 + body * .55) * pow(fil, 2.2) * 2.2;
  // composition varies around the shell: oxygen teal, hydrogen red, iron gold
  float mixA = fbm3(dir * 2. + 31., 4);
  vec3 tint = mix(vec3(1., .3, .12), vec3(.25, .9, 1.), smoothstep(.45, .7, mixA));
  tint = mix(tint, vec3(1., .72, .3), smoothstep(.55, .75, fbm3(dir * 3.5 + 8., 3)) * .7);
  col += tint * dens;
  // hot inner gas and radial rays early on
  float rays = pow(noise2(vec2(ang * 18., t * 2.)), 3.) * smoothstep(1.4, .1, r) * (1. - t) * 1.5;
  col += vec3(.75, .85, 1.) * (exp(-r * r * 5.) * 1.2 * (1. - t * .7) + rays);
  // central blinding core / remnant
  float dc = length(p - uCenter);
  col += vec3(.85, .9, 1.) * (exp(-dc / (S * .01)) * 4. + exp(-dc / (S * .06)) * .8) * uCore;
  float a2 = atan(p.y - uCenter.y, p.x - uCenter.x);
  col += vec3(.8, .9, 1.) * (pow(abs(cos(a2 * 2.)), 200.) + pow(abs(cos(a2 * 2. + .785)), 300.) * .6) * exp(-dc / (S * .35)) * uCore * 1.5;
  col += vec3(1.) * uFlash * exp(-dc / (S * .5)) * 3.;
  col = aces(col * uExposure);
  fragColor = vec4(pow(col, vec3(1. / 2.2)), 0.);
}`;
