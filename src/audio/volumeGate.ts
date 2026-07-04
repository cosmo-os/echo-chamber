import { isAboveThreshold } from './levelDetector.ts'

export function outputGainForLevel(rms: number, threshold: number): number {
  return isAboveThreshold(rms, threshold) ? 1 : 0
}