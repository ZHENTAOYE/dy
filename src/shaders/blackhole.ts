// Schwarzschild black hole, ray-marched. Photons follow x'' = -1.5 h^2 x / r^5 (rs = 1),
// which reproduces the photon ring, the lensed far side of the disk and the shadow.
export const BLACKHOLE_FRAG = /* glsl */ `
uniform vec3 uCam;
uniform vec3 uTarget;
uniform float uFov, uDisk, uExposure, uRollDeg, uStars;

vec3 background(vec3 d) {
  vec3 c = starsDir(d, .07) * uStars * .8;
  float n = fbm3(d * 2.2 + 4., 5);
  float n2 = fbm3(d * 4. - 2., 4);
  c += vec3(.35, .18, .6) * pow(smoothstep(.45, .85, n), 2.) * .35;
  c += vec3(.1, .3, .55) * pow(smoothstep(.5, .9, n2), 2.) * .25;
  // a faint galactic band
  c += vec3(.5, .45, .4) * exp(-pow(d.y * 3. + .3 * d.x, 2.)) * .08 * (.5 + n);
  return c;
}

vec4 diskSample(vec3 p, vec3 rayDir) {
  float r = length(p.xz);
  float rin = 2.6, rout = 9.5;
  if (r < rin || r > rout) return vec4(0);
  float phi = atan(p.z, p.x);
  float omega = 1.6 * pow(r, -1.5);
  float pr = phi + uTime * omega * 6.;
  vec3 tp = vec3(r * 1.2, cos(pr) * 2.5, sin(pr) * 2.5);
  float n = fbm3(tp * vec3(1.6, 1., 1.) + vec3(0., 0., 0.), 5);
  float streaks = fbm3(vec3(r * 9., cos(pr) * 1.2, sin(pr) * 1.2), 4);
  float dens = smoothstep(rin, rin + .35, r) * pow(smoothstep(rout, rin * 1.2, r), 1.6);
  dens *= .35 + 1.3 * n * n + .5 * streaks;
  float temp = pow(rin / r, .9);
  vec3 col = mix(vec3(1., .28, .06), vec3(1., .72, .38), smoothstep(.2, .6, temp));
  col = mix(col, vec3(1., .95, .88), smoothstep(.6, .95, temp));
  // relativistic beaming: the side moving toward us is brighter and bluer
  vec3 v = normalize(vec3(-p.z, 0., p.x)) * sqrt(.5 / r);
  float beta = length(v);
  float cosT = dot(v / beta, -rayDir);
  float D = sqrt(1. - beta * beta) / (1. - beta * cosT);
  float g = sqrt(max(1. - 1. / r, 0.)) * D;
  col *= pow(g, 3.2) * mix(vec3(1.), vec3(.75, .85, 1.15), clamp((g - 1.) * 1.5, 0., 1.));
  float a = clamp(dens * .8, 0., 1.);
  return vec4(col * dens * 1.7 * temp, a);
}

void main() {
  vec2 p = pixel();
  vec2 uv = (p - uView * .5) / (uView.y * .5) * vec2(1, -1);
  uv = rot2(uRollDeg * PI / 180.) * uv;
  vec3 fw = normalize(uTarget - uCam);
  vec3 rt = normalize(cross(fw, vec3(0, 1, 0)));
  vec3 up = cross(rt, fw);
  float tf = tan(uFov * PI / 360.);
  vec3 dir = normalize(fw + (uv.x * rt + uv.y * up) * tf);
  vec3 pos = uCam;
  vec3 vel = dir;
  float h2 = dot(cross(pos, vel), cross(pos, vel));
  vec3 col = vec3(0);
  float alpha = 0.;
  bool captured = false;
  float minR = 1e9;
  for (int i = 0; i < 240; i++) {
    float r = length(pos);
    minR = min(minR, r);
    if (r < 1.) { captured = true; break; }
    if (r > 70. && dot(pos, vel) > 0.) break;
    float dt = clamp(r * .055, .015, 1.5);
    vec3 acc = -1.5 * h2 * pos / pow(r, 5.);
    vec3 prev = pos;
    vel += acc * dt;
    pos += vel * dt;
    if (prev.y * pos.y < 0.) {
      vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
      vec4 ds = diskSample(hit, normalize(vel));
      ds *= uDisk;
      col += (1. - alpha) * ds.rgb;
      alpha += (1. - alpha) * ds.a;
      if (alpha > .985) break;
    }
  }
  if (!captured) col += (1. - alpha) * background(normalize(vel));
  // a thin glow just outside the photon sphere
  col += vec3(1., .7, .45) * exp(-pow((minR - 1.55) * 7., 2.)) * .25 * uDisk * (1. - alpha);
  col = aces(col * uExposure);
  fragColor = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;
