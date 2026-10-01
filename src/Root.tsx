import React from 'react';
import {Composition, Still} from 'remotion';
import {Cover} from './Cover';
import {loadFonts} from './fonts';
import {QECVideo} from './QECVideo';
import {FPS, H, W} from './theme';
import {TOTAL_FRAMES} from './timeline';

loadFonts();

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="QuantumErrorCorrection"
      component={QECVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{sfx: true}}
    />
    <Still id="Cover" component={Cover} width={W} height={H} />
  </>
);
