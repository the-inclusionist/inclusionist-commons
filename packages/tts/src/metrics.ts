// Pure synthesis metric. (PCM normalization — peak/gain — lives in @the-inclusionist/audio, its natural home.)

/** Real-time factor: synthesis time ÷ audio duration. <1 = faster than real time. */
export function computeRtf(synthMs: number, audioSec: number): number {
  if (audioSec <= 0) return Number.POSITIVE_INFINITY;
  return synthMs / 1000 / audioSec;
}
