import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';

// 字体文件由 scripts/fetch-fonts.mjs 生成（Google Fonts 子集，OFL 授权）
const FONTS = [
  {family: 'Noto Sans SC', weight: '500', file: 'fonts/noto-sans-sc-500.woff2'},
  {family: 'Noto Sans SC', weight: '700', file: 'fonts/noto-sans-sc-700.woff2'},
  {family: 'Noto Sans SC', weight: '900', file: 'fonts/noto-sans-sc-900.woff2'},
  {family: 'Orbitron', weight: '500', file: 'fonts/orbitron-500.woff2'},
  {family: 'Orbitron', weight: '700', file: 'fonts/orbitron-700.woff2'},
  {family: 'Orbitron', weight: '900', file: 'fonts/orbitron-900.woff2'},
  {family: 'Noto Sans Math', weight: '400', file: 'fonts/noto-sans-math-400.woff2'},
];

let started = false;

export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('加载字体');
  Promise.all(
    FONTS.map((f) =>
      new FontFace(f.family, `url(${staticFile(f.file)}) format('woff2')`, {weight: f.weight})
        .load()
        .then((face) => document.fonts.add(face)),
    ),
  )
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};
