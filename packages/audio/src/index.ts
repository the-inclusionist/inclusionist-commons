// @the-inclusionist/audio — tiny WebAudio playback + PCM normalization.
export { peakOf, gainFromPeak, toFloat32 } from './normalize.js';
export type { AudioPlayer } from './player.js';
export { WebAudioPlayer } from './player.js';

export const VERSION = '0.1.0';
