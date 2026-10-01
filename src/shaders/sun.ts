// The Sun: boiling granulation, sunspots, limb darkening, corona streamers, prominences and a flare.
export const SUN_FRAG = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius, uGlare, uExposure, uFlare, uFlareAng, uDetail;

vec3 plasma(float x) {
  x = clamp(x, 0., 1.6);
  vec3 c = mix(vec3(.35, .03, .0), vec3(.95, .3, .02), smoothstep(.0, .55, x));
  c = mix(c, vec3(1., .66, .16), smoothstep(.5, .95, x));
  c = mix(c, vec3(1., .93, .7), smoothstep(1., 1.45, x));
  return c * (.25 + x * .8);
}

// A magnetic loop of plasma: a few braided strands arching between two footpoints.
float loopGlow(float ang, float r, float a0, float w, float h, float t) {
  float u = (ang - a0) / w;
  if (abs(u) > 1.3) return 0.;
  float arch = sqrt(max(0., 1. - u * u));
  float g = 0.;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float rr = 1. + h * arch * (.82 + .1 * fk + .05 * sin(u * 4. + t * .7 + fk * 2.));
    float th = h * (.09 + .05 * fk);
    float dist = r - rr;
    g += exp(-dist * dist / (th * th)) * (.5 + .7 * noise2(vec2(u * 7. + fk * 3. - t * .9, a0 * 9. + fk)));
  }
  return g * smoothstep(1.3, .85, abs(u)) * .6;
}

void main() {
  vec2 p = pixel();
  vec2 q = (p - uCenter) / uRadius * vec2(1, -1);
  float d = length(q);
  float aa = 1.5 / uRadius;
  float t = uTime;
  vec3 col = vec3(0);
  float alpha = 0.;
  if (d < 1. + aa) {
    vec3 n = vec3(q, sqrt(max(0., 1. - d * d)));
    vec3 pn = rotY(n, t * .02);
    float warp = fbm3(pn * 2.5 + vec3(0, 0, t * .04), 4);
    float big = fbm3(pn * 5. + warp * 1.5 + vec3(t * .03), 5);
    float gran = ridged3(pn * 38. * uDetail + vec3(warp * 2., t * .25, 0.), 3);
    float fine = noise3(pn * 120. * uDetail + t * .4);
    float spots = smoothstep(.70, .76, fbm3(pn * 2.2 + 31., 5));
    float pen = smoothstep(.66, .72, fbm3(pn * 2.2 + 31., 5));
    float limb = pow(n.z, .42);
    float v = (.3 + .65 * big + .55 * gran + .12 * fine) * limb;
    v *= 1. - pen * .45 - spots * .45;
    // faculae: bright patches near the limb
    v += smoothstep(.55, .8, fbm3(pn * 7. + 5., 4)) * (1. - n.z) * .5;
    col = plasma(v);
    alpha = smoothstep(1. + aa, 1. - aa, d);
    col *= alpha;
  }
  float ang = atan(q.y, q.x);
  if (d > 1. - aa) {
    float r = max(d, 1.);
    vec2 cs = vec2(cos(ang), sin(ang));
    // corona with slowly drifting streamers
    float streak = fbm2(vec2(ang * 5., r * 1.2 - t * .05), 5);
    float corona = exp(-(r - 1.) * 9.) * .7 + exp(-(r - 1.) * 2.5) * .12 * (.3 + streak);
    // ragged fiery edge
    float flame = fbm3(vec3(cs * 4., (r - 1.) * 9. - t * .7), 6);
    float fire = pow(max(0., flame - (r - 1.) * 5. - .3), 1.4) * 2.2;
    // prominence loops
    float lp = 0.;
    lp += loopGlow(ang, r, 2.5, .13, .16 + .02 * sin(t * .5), t);
    lp += loopGlow(ang, r, .7, .17, .2 + .03 * sin(t * .3 + 1.), t + 7.);
    lp += loopGlow(ang, r, -2.4, .09, .1, t + 11.);
    lp += loopGlow(ang, r, 1.68, .035, .045, t + 4.);
    lp += loopGlow(ang, r, 1.98, .05, .07, t + 9.);
    lp *= .5 + 1. * fbm3(vec3(cs * 20., r * 14. - t * .4), 4);
    // flare: a coronal mass ejection bubble tearing away from the limb near uFlareAng
    float da = atan(sin(ang - uFlareAng), cos(ang - uFlareAng));
    float tx = da * r;
    float hy = r - 1.;
    float plume = 0.;
    if (uFlare > 0.) {
      float hb = uFlare * .5;
      float rb = .02 + uFlare * .2;
      vec2 lc = vec2(tx, hy - hb);
      float turb = fbm3(vec3(tx * 28., hy * 28. - t * 3., t * .5), 6);
      float shell = exp(-pow((length(lc) - rb) / (.015 + rb * .22), 2.));
      float core = exp(-dot(lc, lc) / (rb * rb * .45)) * .5;
      float column = exp(-tx * tx / (.0006 + hy * .006)) * smoothstep(hb + rb * .5, 0., hy);
      plume = (shell * 1.3 + core + column * 1.2) * pow(turb, 2.5) * 4. * (1.3 - uFlare * .5);
      plume += exp(-(tx * tx + hy * hy) * 1500.) * 4. * smoothstep(0., .15, uFlare);
    }
    float e = fire + lp * 1.1 + plume;
    vec3 flameC = vec3(1., .28, .05) * e + vec3(1., .75, .4) * e * e * .35;
    vec3 halo = vec3(1., .45, .15) * corona + flameC;
    col += halo * (1. - alpha);
  }
  // camera glare for the approach and the flare
  float S = min(uView.x, uView.y);
  vec2 dp = p - uCenter;
  float dist = length(dp);
  float g = exp(-dist / (S * .02)) * 3. + exp(-dist / (S * .15)) * .4;
  float a2 = atan(dp.y, dp.x);
  g += (pow(abs(cos(a2 * 3.)), 80.) + pow(abs(cos(a2 * 2. + .7)), 120.) * .7) * exp(-dist / (S * .25)) * 1.5;
  g += exp(-abs(dp.y) / (S * .005)) * exp(-abs(dp.x) / (S * .6)) * .8;
  col += vec3(1., .82, .6) * g * uGlare;
  col = aces(col * uExposure);
  fragColor = vec4(pow(col, vec3(1. / 2.2)), alpha);
}`;
