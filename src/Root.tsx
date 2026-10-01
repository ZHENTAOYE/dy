import React from 'react';
import {Composition} from 'remotion';
import {ensureFonts} from './fonts';
import {Universe} from './Video';
import {FPS, TOTAL, SCENES} from './timing';
import {Intro} from './scenes/Intro';
import {Earth} from './scenes/Earth';
import {Sun} from './scenes/Sun';
import {Solar} from './scenes/Solar';
import {Stars} from './scenes/Stars';
import {BlackHole} from './scenes/BlackHole';
import {MilkyWay} from './scenes/MilkyWay';
import {CosmicWeb} from './scenes/CosmicWeb';
import {BigBang} from './scenes/BigBang';
import {Finale} from './scenes/Finale';

ensureFonts();

const SCENE_COMPONENTS = {Intro, Earth, Sun, Solar, Stars, BlackHole, MilkyWay, CosmicWeb, BigBang, Finale};
const durOf = (i: number) => SCENES[i].dur;

export const RemotionRoot: React.FC = () => (
  <>
    {/* Vertical 9:16 for short-video platforms (Douyin) */}
    <Composition id="Universe" component={Universe} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
    {/* Horizontal 16:9 version of the same film */}
    <Composition id="UniverseLandscape" component={Universe} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    {/* Individual scenes for previewing */}
    {Object.entries(SCENE_COMPONENTS).map(([id, C], i) => (
      <Composition key={id} id={id} component={C} durationInFrames={durOf(i)} fps={FPS} width={1080} height={1920} />
    ))}
  </>
);
