import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/montserrat/200.css';
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/space-mono/400.css';
import {continueRender, delayRender} from 'remotion';
import {ALL_TEXT} from './script';

export const SERIF = '"Noto Serif SC", serif';
export const SANS = '"Noto Sans SC", sans-serif';
export const LATIN = 'Montserrat, "Noto Sans SC", sans-serif';
export const MONO = '"Space Mono", "Noto Sans SC", monospace';

const EXTRA = '0123456789,.+-×−–—·•:;!?%()[]/℃°⁰¹²³⁴⁵⁶⁷⁸⁹⁻ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz*→←↑↓◆◇○●「」《》“”';

let started = false;

// CJK fonts are split into unicode-range chunks; load exactly the chunks the video uses
// before the first frame is captured so no frame ever shows a fallback font.
export const ensureFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender('Loading fonts');
  const text = ALL_TEXT + EXTRA;
  const specs = [
    `500 40px "Noto Serif SC"`,
    `700 40px "Noto Serif SC"`,
    `900 40px "Noto Serif SC"`,
    `300 40px "Noto Sans SC"`,
    `400 40px "Noto Sans SC"`,
    `500 40px "Noto Sans SC"`,
    `200 40px Montserrat`,
    `300 40px Montserrat`,
    `500 40px Montserrat`,
    `400 40px "Space Mono"`,
  ];
  Promise.all(specs.map((s) => document.fonts.load(s, text)))
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
