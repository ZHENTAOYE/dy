import React from 'react';
import {S1Hook} from './scenes/S1Hook';
import {S2Qubit} from './scenes/S2Qubit';
import {S3Noise} from './scenes/S3Noise';
import {S4Classical} from './scenes/S4Classical';
import {S5Walls} from './scenes/S5Walls';
import {S6Trick} from './scenes/S6Trick';
import {S7Surface} from './scenes/S7Surface';
import {S8Threshold} from './scenes/S8Threshold';
import {S9Outro} from './scenes/S9Outro';
import {C} from './theme';
import DURATIONS from './scenes.json';

type SceneDef = {key: string; component: React.FC; tintA: string; tintB: string; danger?: number};

const DEFS: SceneDef[] = [
  {key: 'hook', component: S1Hook, tintA: C.violet, tintB: C.cyan},
  {key: 'qubit', component: S2Qubit, tintA: C.blue, tintB: C.cyan},
  {key: 'noise', component: S3Noise, tintA: C.red, tintB: C.orange, danger: 1},
  {key: 'classical', component: S4Classical, tintA: C.blue, tintB: C.violet},
  {key: 'walls', component: S5Walls, tintA: C.red, tintB: C.magenta, danger: 1},
  {key: 'trick', component: S6Trick, tintA: C.cyan, tintB: C.green},
  {key: 'surface', component: S7Surface, tintA: C.violet, tintB: C.magenta},
  {key: 'threshold', component: S8Threshold, tintA: C.green, tintB: C.cyan},
  {key: 'outro', component: S9Outro, tintA: C.gold, tintB: C.violet},
];

// 各场景时长统一放在 scenes.json，音效脚本 scripts/make-sfx.mjs 也读取它
export const SCENES = DEFS.reduce<(SceneDef & {id: string; dur: number; start: number})[]>((acc, s) => {
  const prev = acc[acc.length - 1];
  const meta = DURATIONS.find((d) => d.key === s.key);
  if (!meta) throw new Error(`scenes.json 中缺少场景 ${s.key}`);
  acc.push({...s, id: meta.name, dur: meta.dur, start: prev ? prev.start + prev.dur : 0});
  return acc;
}, []);

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.dur, 0);
