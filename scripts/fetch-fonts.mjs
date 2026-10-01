// 扫描 src/ 中出现的所有字符，从 Google Fonts 下载只包含这些字形的 woff2 子集到 public/fonts/
// 用法：NODE_USE_ENV_PROXY=1 node scripts/fetch-fonts.mjs   （无代理时直接 node scripts/fetch-fonts.mjs）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'public', 'fonts');

const FAMILIES = [
  {family: 'Noto Sans SC', slug: 'noto-sans-sc', weights: [500, 700, 900]},
  {family: 'Orbitron', slug: 'orbitron', weights: [500, 700, 900]},
  {family: 'Noto Sans Math', slug: 'noto-sans-math', weights: [400]},
];

const walk = (dir) =>
  fs.readdirSync(dir, {withFileTypes: true}).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));

const chars = new Set();
for (let c = 32; c < 127; c++) chars.add(String.fromCharCode(c));
for (const file of walk(SRC).filter((f) => /\.(tsx?|json)$/.test(f))) {
  for (const ch of fs.readFileSync(file, 'utf8')) if (ch.codePointAt(0) > 127) chars.add(ch);
}
const text = [...chars].sort().join('');
console.log(`共 ${chars.size} 个字符`);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
fs.mkdirSync(OUT, {recursive: true});

for (const fam of FAMILIES) {
  for (const w of fam.weights) {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam.family)}:wght@${w}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url, {headers: {'User-Agent': UA}})).text();
    const m = css.match(/url\((https:[^)]+)\)/);
    if (!m) throw new Error(`没有拿到 ${fam.family} ${w} 的字体地址：\n${css.slice(0, 300)}`);
    const buf = Buffer.from(await (await fetch(m[1])).arrayBuffer());
    const out = path.join(OUT, `${fam.slug}-${w}.woff2`);
    fs.writeFileSync(out, buf);
    console.log(`✓ ${path.relative(ROOT, out)}  ${(buf.length / 1024).toFixed(1)} KB`);
  }
}
