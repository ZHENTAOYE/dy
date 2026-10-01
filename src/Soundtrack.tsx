import React from 'react';
import {Audio} from '@remotion/media';
import {staticFile} from 'remotion';

/** 配乐与音效（由 scripts/make-sfx.mjs 按时间轴程序化合成） */
export const Soundtrack: React.FC = () => <Audio src={staticFile('audio/soundtrack.mp3')} />;
