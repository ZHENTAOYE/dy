// Soft, layered interstellar clouds used behind most scenes.
export const NEBULA_FRAG = /* glsl */ `
uniform vec3 uC1, uC2, uC3;
uniform float uIntensity, uSeed, uZoom;
uniform vec2 uDrift;
void main() {
  vec2 p = (pixel() - uView * .5) / min(uView.x, uView.y);
  p = p / uZoom + uDrift;
  vec3 q = vec3(p * 1.6, uSeed + uTime * .015);
  float warp = fbm3(q * 1.3, 4);
  float n1 = fbm3(q + warp * 1.2, 6);
  float n2 = ridged3(q * 1.7 + vec3(warp), 5);
  float n3 = fbm3(q * 3.1 - warp, 4);
  float dens = smoothstep(.35, .85, n1);
  vec3 col = uC1 * dens * .9 + uC2 * pow(n2, 3.) * smoothstep(.3, .7, n1) * 1.3 + uC3 * pow(smoothstep(.45, .9, n3), 2.) * .6;
  // dark dust lanes eat into the glow
  col *= 1. - .7 * smoothstep(.55, .8, fbm3(q * 2.4 + 9., 5));
  col *= uIntensity;
  fragColor = vec4(pow(col, vec3(.85)), 0.);
}`;
