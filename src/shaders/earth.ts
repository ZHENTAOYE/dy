// Procedural Earth + Moon: continents, clouds, city lights, ocean glint and a scattering atmosphere.
export const EARTH_FRAG = /* glsl */ `
uniform vec2 uCenter;     // CSS px
uniform float uRadius;    // CSS px
uniform float uRot;       // planet spin (radians)
uniform float uCloudRot;
uniform vec3 uSun;        // light direction, view space (x right, y up, z to viewer)
uniform vec2 uMoonC;
uniform float uMoonR;
uniform vec2 uSunPx;
uniform float uSunVis, uGlare, uExposure, uAtmo;

vec3 sunlightTint(float ndl) { return mix(vec3(1., .42, .18), vec3(1., .97, .92), smoothstep(.0, .35, ndl)); }

vec4 earth(vec2 q, float aa) {
  float r2 = dot(q, q);
  float d = sqrt(r2);
  vec3 L = normalize(uSun);
  vec3 col = vec3(0);
  float alpha = 0.;
  if (d < 1. + aa) {
    vec3 n = vec3(q, sqrt(max(0., 1. - r2)));
    vec3 pn = rotY(rotZ(n, -.41), uRot);
    float lat = asin(clamp(pn.y, -1., 1.));
    float w = fbm3(pn * 2.2 + 3.1, 4);
    float h = fbm3(pn * 1.7 + w * .9, 7);
    float land = smoothstep(.535, .55, h);
    float ice = smoothstep(1.08, 1.16, abs(lat) + (fbm3(pn * 6., 3) - .5) * .35);
    float ndl = dot(n, L);
    // ocean
    vec3 ocean = mix(vec3(.004, .018, .06), vec3(.01, .07, .16), smoothstep(.40, .54, h));
    // land biomes by latitude and moisture
    float moist = fbm3(pn * 3.5 + 11., 5);
    float desertBand = 1. - smoothstep(.15, .35, abs(abs(lat) - .4));
    vec3 green = mix(vec3(.035, .06, .02), vec3(.07, .1, .04), moist);
    vec3 desert = mix(vec3(.42, .3, .16), vec3(.55, .42, .25), fbm3(pn * 9., 3));
    vec3 landC = mix(green, desert, clamp(desertBand * smoothstep(.45, .6, 1. - moist) * 1.5, 0., 1.));
    landC = mix(landC, vec3(.2, .17, .13), smoothstep(.62, .72, h) * .7); // highlands
    vec3 albedo = mix(ocean, landC, land);
    albedo = mix(albedo, vec3(.82, .86, .92), ice);
    // clouds with a little swirl
    vec3 cp = rotY(rotZ(n, -.41), uCloudRot);
    float cw = fbm3(cp * 3. + 7., 4);
    float cn = fbm3(cp * 3.4 + vec3(cw * 2.2, cw * 1.4, 0.), 7);
    float cloud = smoothstep(.54, .82, cn) * .9;
    cloud = max(cloud, smoothstep(.6, .9, fbm3(vec3(cp.x * 4., cp.y * 16., cp.z * 4.) + cw * 3., 5)) * .45);
    float diff = max(0., (ndl + .04) / 1.04);
    vec3 sunC = sunlightTint(ndl) * 2.4;
    vec3 surf = albedo * diff * sunC;
    // ocean glint
    vec3 R = reflect(-L, n);
    float spec = pow(max(R.z, 0.), 55.) * (1. - land) * (1. - ice);
    surf += sunC * spec * .9 * (1. - cloud);
    surf += sunC * pow(max(R.z, 0.), 8.) * (1. - land) * .05;
    vec3 cloudC = vec3(.95, .96, 1.) * diff * sunC * 1.05;
    surf = mix(surf, cloudC, cloud);
    // night side city lights
    float night = 1. - smoothstep(-.12, .12, ndl);
    float clusters = smoothstep(.52, .78, fbm3(pn * 12. + 4., 3));
    float cities = clusters * (smoothstep(.62, .95, noise3(pn * 110.)) * .7 + smoothstep(.7, 1., noise3(pn * 380.)) * .8);
    surf += vec3(1., .62, .28) * cities * land * (1. - ice) * night * (1. - cloud * .85) * 1.1;
    // atmosphere inside the disc
    float rim = pow(1. - n.z, 2.2);
    float atmoLit = smoothstep(-.3, .45, ndl);
    surf = mix(surf, vec3(.25, .5, 1.) * atmoLit * 1.2, clamp(rim * .6 * uAtmo, 0., 1.));
    surf += vec3(.05, .1, .25) * diff * .25 * uAtmo;
    col = surf;
    alpha = smoothstep(1. + aa, 1. - aa, d);
  }
  // atmosphere halo outside the limb (additive)
  float hgt = .035;
  if (d > 1. - aa) {
    float x = max(d - 1., 0.) / hgt;
    vec2 m = q / max(d, 1e-4);
    float lit = smoothstep(-.35, .55, dot(m, L.xy) * .9 + L.z * .5);
    float fwd = pow(max(dot(m, normalize(L.xy + 1e-5)), 0.), 18.) * smoothstep(.05, -.6, L.z);
    vec3 halo = vec3(.28, .55, 1.) * lit * exp(-x * 2.2) * 1.2 + vec3(1., .55, .25) * fwd * exp(-x * 1.4) * 5.;
    col = col * alpha + halo * uAtmo * (1. - alpha * .6);
  } else {
    col *= alpha;
  }
  return vec4(col, alpha);
}

vec4 moon(vec2 q, float aa) {
  float d = length(q);
  if (d > 1. + aa) return vec4(0);
  vec3 n = vec3(q, sqrt(max(0., 1. - d * d)));
  vec3 pn = rotY(n, .6);
  float maria = smoothstep(.5, .6, fbm3(pn * 1.6 + 2., 5));
  float craters = 1. - smoothstep(.0, .25, voronoi2(pn.xy * 7. + pn.z * 3.)) * .3;
  float albedo = (.42 - maria * .18) * craters * (.85 + .3 * fbm3(pn * 12., 4));
  float ndl = dot(n, normalize(uSun));
  float a = smoothstep(1. + aa, 1. - aa, d);
  return vec4(vec3(albedo) * max(ndl, 0.) * 2.2 * a, a);
}

void main() {
  vec2 p = pixel();
  vec4 e = earth((p - uCenter) / uRadius * vec2(1, -1), 1.5 / uRadius);
  vec4 m = vec4(0);
  if (uMoonR > .5) m = moon((p - uMoonC) / uMoonR * vec2(1, -1), 1.5 / uMoonR);
  vec3 col = m.rgb * (1. - e.a) + e.rgb;
  float alpha = max(e.a, m.a);
  // sun glare with anamorphic streak
  float S = min(uView.x, uView.y);
  vec2 dp = p - uSunPx;
  float dist = length(dp);
  float glare = exp(-dist / (S * .008)) * 4. + exp(-dist / (S * .05)) * .7 + exp(-dist / (S * .3)) * .22;
  glare += exp(-abs(dp.y) / (S * .004)) * exp(-abs(dp.x) / (S * .55)) * .9;
  float ang = atan(dp.y, dp.x);
  glare += (pow(abs(cos(ang * 3. + .3)), 60.) + pow(abs(cos(ang * 2. + 1.1)), 90.) * .6) * exp(-dist / (S * .12)) * 1.4;
  vec3 g = vec3(1., .86, .66) * glare * uSunVis * uGlare;
  col = aces(col * uExposure);
  col = pow(col, vec3(1. / 2.2));
  vec3 gl = pow(aces(g), vec3(1. / 2.2));
  fragColor = vec4(col + gl * (1. - col), alpha);
}`;
