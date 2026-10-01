// Fast preview: bundle once, render a handful of stills, tile them into one contact sheet.
// Usage: node scripts/preview.mjs <CompositionId> <frame,frame,...> [scale]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const [id, framesArg, scaleArg] = process.argv.slice(2);
const frames = framesArg.split(',').map(Number);
const scale = Number(scaleArg ?? 0.4);
const outDir = path.resolve('out/stills');
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), enableCaching: true});
const gl = process.env.REMOTION_GL ?? 'swangle';
const browser = await openBrowser('chrome', {
  browserExecutable: process.env.REMOTION_BROWSER ?? null,
  chromiumOptions: {gl},
});
const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser, chromiumOptions: {gl}});
const files = [];
const t0 = Date.now();
const queue = [...frames];
const worker = async () => {
  while (queue.length) {
    const frame = queue.shift();
    const output = path.join(outDir, `${id}-${frame}.jpg`);
    const s = Date.now();
    await renderStill({composition, serveUrl, frame, output, imageFormat: 'jpeg', jpegQuality: 85, scale, puppeteerInstance: browser, chromiumOptions: {gl}});
    console.log(`frame ${frame}: ${Date.now() - s}ms`);
    files.push([frame, output]);
  }
};
await Promise.all([worker(), worker(), worker()]);
await browser.close({silent: true});
files.sort((a, b) => a[0] - b[0]);
const sheet = path.resolve(`out/sheet-${id}.jpg`);
const inputs = files.flatMap(([, f]) => ['-i', f]);
const cols = Math.min(files.length, composition.width > composition.height ? 3 : 6);
const rows = Math.ceil(files.length / cols);
const layout = files.map((_, i) => `${(i % cols) === 0 ? '0' : Array.from({length: i % cols}, (_, k) => `w${k}`).join('+')}_${Math.floor(i / cols) === 0 ? '0' : Array.from({length: Math.floor(i / cols)}, (_, k) => `h${k * cols}`).join('+')}`).join('|');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', files.length > 1 ? `xstack=inputs=${files.length}:layout=${layout}:fill=black` : 'null', sheet]);
console.log(`sheet: ${sheet} (${rows}x${cols}) in ${Date.now() - t0}ms`);
