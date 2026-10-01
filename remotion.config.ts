import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// WebGL backend. 'swangle' (software) works everywhere, including GPU-less servers.
// On a desktop with a GPU, REMOTION_GL=angle renders the shaders much faster.
type GlRenderer = 'swangle' | 'angle' | 'egl' | 'swiftshader' | 'vulkan' | 'angle-egl';
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as GlRenderer) || 'swangle');
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
// Optional: point at an existing Chromium instead of letting Remotion download one.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
