// The Big Bang: a blinding fireball of outward-streaming plasma with shock rings and god rays,
// which cools into the mottled cosmic microwave background.
export const BANG_FRAG = /* glsl */ `
uniform float uT, uFlash, uCMB, uExposure, uFire;
uniform vec2 uCenter;

vec3 heat(float x) {
  x = clamp(x, 0., 2.5);
  vec3 c = mix(vec3(.08, .0, .18), vec3(.6, .05, .45), smoothstep(.0, .25, x));
  c = mix(c, vec3(1., .25, .1), smoothstep(.2, .55, x));
  c = mix(c, vec3(1., .65, .2), smoothstep(.5, .9, x));
  c = mix(c, vec3(1., .95, .8), smoothstep(.9, 1.4, x));
  c = mix(c, vec3(.8, .9, 1.), smoothstep(1.4, 2.2, x));
  return c * (.4 + x);
}

vec3 cmbMap(float v) {
  vec3 c = mix(vec3(.02, .05, .35), vec3(.1, .45, .95), smoothstep(.2, .4, v));
  c = mix(c, vec3(.55, .8, .75), smoothstep(.4, .5, v));
  c = mix(c, vec3(1., .75, .25), smoothstep(.5, .6, v));
  c = mix(c, vec3(.9, .2, .06), smoothstep(.6, .78, v));
  return c;
}

void main() {
  vec2 p = pixel();
  float S = min(uView.x, uView.y);
  float D = length(uView);
  vec2 d = p - uCenter;
  float r = length(d) / D;
  float ang = atan(d.y, d.x);
  float t = uT;
  vec3 col = vec3(0);
  if (uFire > 0.) {
    float R = .015 + .95 * (1. - exp(-t * .75));
    float x = r / R;
    vec3 dir = vec3(cos(ang), sin(ang), 0.);
    // outward-streaming filaments: noise advected along log-radius
    float lr = log(r + .002);
    float warp = fbm3(vec3(dir.xy * 2.5, lr * 1.5 - t * 1.2), 4);
    float n = fbm3(vec3(dir.xy * 4. + warp * 1.5, lr * 3. - t * 2.6), 6);
    float fil = ridged3(vec3(dir.xy * 7. + warp, lr * 5. - t * 3.5), 5);
    float body = exp(-x * x * 1.6);
    float shock = exp(-pow((x - 1.) * 9., 2.)) * 1.4;
    float e = body * (.45 + 1.3 * n + .9 * fil * fil) + shock * (.6 + fil);
    // god rays
    float rays = pow(noise2(vec2(ang * 30., t * .7)), 5.) * 2.5 + pow(noise2(vec2(ang * 9. + 3., t * .4)), 3.) * .8;
    e += rays * exp(-x * 1.4) * .9;
    // fast chromatic shock rings
    float rr = t * .9;
    vec3 ring = vec3(exp(-pow((r - rr * 1.02) * 60., 2.)), exp(-pow((r - rr) * 60., 2.)), exp(-pow((r - rr * .98) * 60., 2.))) * exp(-t * 1.2) * 2.;
    float cool = exp(-t * .35);
    col = heat(e * (1.1 * cool + .2)) * e * .55 + ring;
    col += vec3(1., .97, .9) * exp(-r * r / (R * R * .003)) * 3. * cool;
    col *= uFire;
  }
  if (uCMB > 0.) {
    vec2 q = (p - uView * .5) / S;
    float v = fbm2(q * 7. + 3., 6) * .65 + fbm2(q * 22. + 9., 4) * .35;
    v += (fbm2(q * 2.2 + uT * .02, 3) - .5) * .25;
    col = mix(col, cmbMap(v) * .62, uCMB);
  }
  col += vec3(1.) * uFlash * 4.;
  col = aces(col * uExposure);
  fragColor = vec4(pow(col, vec3(1. / 2.2)), 0.);
}`;
