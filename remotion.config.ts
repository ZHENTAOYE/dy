import {Config} from '@remotion/cli/config';
import fs from 'node:fs';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

// 云端/离线环境：如果设置了 REMOTION_BROWSER 或存在预装的 headless shell，就直接用它
const preinstalled = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = process.env.REMOTION_BROWSER ?? (fs.existsSync(preinstalled) ? preinstalled : null);
if (browser) {
  Config.setBrowserExecutable(browser);
}
