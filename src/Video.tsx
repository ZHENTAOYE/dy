import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, getStaticFiles} from 'remotion';
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
import {Fade, Flash} from './components/Fx';
import {ScaleHud, ScaleKey} from './components/ScaleHud';
import {SCENES, SceneId, sceneStarts as at} from './timing';

const COMPONENTS: Record<SceneId, React.FC> = {
  intro: Intro,
  earth: Earth,
  sun: Sun,
  solar: Solar,
  stars: Stars,
  blackhole: BlackHole,
  milky: MilkyWay,
  web: CosmicWeb,
  bang: BigBang,
  finale: Finale,
};

// log10(meters) across the field of view as the journey progresses.
const SCALE_KEYS: ScaleKey[] = [
  [at.earth, 6.6],
  [at.earth + 250, 7.2],
  [at.earth + 390, 8.9],
  [at.sun + 70, 9.3],
  [at.sun + 400, 8.6],
  [at.solar + 10, 11.9],
  [at.solar + 250, 13.2],
  [at.solar + 450, 16.6],
  [at.stars + 10, 9.4],
  [at.stars + 290, 12.6],
  [at.stars + 640, 15.5],
  [at.blackhole + 120, 14.0],
  [at.blackhole + 580, 12.5],
  [at.milky + 20, 18.5],
  [at.milky + 320, 21.1],
  [at.milky + 565, 22.6],
  [at.web + 210, 24.6],
  [at.web + 420, 26.9],
];

export const Universe: React.FC = () => {
  const hasAudio = getStaticFiles().some((f) => f.name === 'soundtrack.wav');
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {SCENES.map((s) => {
        const C = COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={at[s.id]} durationInFrames={s.dur} name={s.id}>
            <Fade dur={s.dur} fadeIn={s.overlap}>
              <C />
            </Fade>
          </Sequence>
        );
      })}
      {/* white bridges between scenes that cut on a flash */}
      <Sequence from={at.solar} durationInFrames={40}>
        <Flash at={0} rise={1} decay={14} peak={0.9} color="255,240,220" />
      </Sequence>
      <Sequence from={at.finale} durationInFrames={40}>
        <Flash at={0} rise={1} decay={12} peak={0.85} />
      </Sequence>
      <ScaleHud keys={SCALE_KEYS} from={at.earth + 20} to={at.web + 445} />
      {hasAudio ? <Audio src={staticFile('soundtrack.wav')} /> : null}
    </AbsoluteFill>
  );
};
