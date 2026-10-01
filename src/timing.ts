// Single source of truth for scene lengths and key moments (frames @ 30 fps).
// Imported by the scenes and exported to JSON for the soundtrack generator.
export const FPS = 30;

export const INTRO_DUR = 300;
export const TITLE_AT = 214;
export const GATHER_FROM = 150;

export const EARTH_DUR = 450;
export const LAP_START = 228;
export const BEAM_START = 352;

export const SUN_DUR = 480;
export const SUN_FLARE_PEAK = 452;

export const SOLAR_DUR = 480;

export const STARS_DUR = 660;
export const NOVA_AT = 462;

export const BH_DUR = 600;
export const BH_IGNITE = 66;

export const MW_DUR = 570;

export const WEB_DUR = 600;
export const COLLAPSE_START = 440;

export const BANG_DUR = 660;
export const BANG_AT = 84;
export const STARS_ON = 462;
export const WARP_START = 575;

export const FINALE_DUR = 600;
export const ARRIVE = 132;

export type SceneId = 'intro' | 'earth' | 'sun' | 'solar' | 'stars' | 'blackhole' | 'milky' | 'web' | 'bang' | 'finale';

// `overlap`: frames this scene cross-fades over the end of the previous one.
export const SCENES: {id: SceneId; dur: number; overlap: number}[] = [
  {id: 'intro', dur: INTRO_DUR, overlap: 0},
  {id: 'earth', dur: EARTH_DUR, overlap: 14},
  {id: 'sun', dur: SUN_DUR, overlap: 12},
  {id: 'solar', dur: SOLAR_DUR, overlap: 0},
  {id: 'stars', dur: STARS_DUR, overlap: 0},
  {id: 'blackhole', dur: BH_DUR, overlap: 0},
  {id: 'milky', dur: MW_DUR, overlap: 0},
  {id: 'web', dur: WEB_DUR, overlap: 24},
  {id: 'bang', dur: BANG_DUR, overlap: 0},
  {id: 'finale', dur: FINALE_DUR, overlap: 0},
];

export const sceneStarts = (() => {
  const out = {} as Record<SceneId, number>;
  let t = 0;
  SCENES.forEach((s, i) => {
    if (i > 0) t -= s.overlap;
    out[s.id] = t;
    t += s.dur;
  });
  return out;
})();

export const TOTAL = SCENES.reduce((a, s) => a + s.dur - s.overlap, 0);

// Moments the soundtrack hits (absolute frames). kind: impact | riser | swell | silence | tick
export const EVENTS = [
  {at: sceneStarts.intro + GATHER_FROM - 40, kind: 'riser', len: 40 + TITLE_AT - GATHER_FROM, power: 0.7},
  {at: sceneStarts.intro + TITLE_AT, kind: 'impact', power: 0.85},
  {at: sceneStarts.earth + 30, kind: 'swell', power: 0.5},
  {at: sceneStarts.earth + LAP_START, kind: 'tick', power: 0.4},
  {at: sceneStarts.earth + BEAM_START, kind: 'tick', power: 0.4},
  {at: sceneStarts.sun + 4, kind: 'impact', power: 0.5},
  {at: sceneStarts.sun + SUN_FLARE_PEAK - 80, kind: 'riser', len: 80, power: 0.8},
  {at: sceneStarts.sun + SUN_FLARE_PEAK, kind: 'impact', power: 0.9},
  {at: sceneStarts.stars + NOVA_AT - 90, kind: 'riser', len: 90, power: 0.9},
  {at: sceneStarts.stars + NOVA_AT - 14, kind: 'silence', len: 14, power: 1},
  {at: sceneStarts.stars + NOVA_AT, kind: 'impact', power: 1.0},
  {at: sceneStarts.blackhole + BH_IGNITE, kind: 'impact', power: 0.75},
  {at: sceneStarts.blackhole + 455, kind: 'riser', len: 125, power: 0.8},
  {at: sceneStarts.blackhole + 585, kind: 'silence', len: 20, power: 1},
  {at: sceneStarts.milky + 10, kind: 'swell', power: 0.8},
  {at: sceneStarts.web + 20, kind: 'swell', power: 0.7},
  {at: sceneStarts.web + COLLAPSE_START, kind: 'riser', len: WEB_DUR - COLLAPSE_START - 6, power: 1.0},
  {at: sceneStarts.web + WEB_DUR - 6, kind: 'silence', len: BANG_AT + 6, power: 1},
  {at: sceneStarts.bang + BANG_AT, kind: 'impact', power: 1.3},
  {at: sceneStarts.bang + STARS_ON, kind: 'swell', power: 0.6},
  {at: sceneStarts.bang + WARP_START, kind: 'riser', len: BANG_DUR - WARP_START, power: 0.9},
  {at: sceneStarts.finale, kind: 'impact', power: 0.6},
  {at: sceneStarts.finale + ARRIVE, kind: 'swell', power: 0.9},
] as const;
