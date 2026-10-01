// Prints src/timing.ts as JSON so the Python soundtrack generator shares the video's timeline.
import {buildSync} from 'esbuild';

const out = buildSync({entryPoints: ['src/timing.ts'], bundle: true, format: 'cjs', write: false, logLevel: 'error'});
const mod = {exports: {}};
new Function('module', 'exports', out.outputFiles[0].text)(mod, mod.exports);
const {FPS, TOTAL, SCENES, sceneStarts, EVENTS} = mod.exports;
process.stdout.write(JSON.stringify({fps: FPS, total: TOTAL, scenes: SCENES, starts: sceneStarts, events: EVENTS}, null, 1));
