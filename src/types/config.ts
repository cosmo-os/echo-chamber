export interface EchoConfig {
  delayMs: number
  threshold: number
}

export const MIN_DELAY_MS = 100
export const MAX_DELAY_MS = 3000
export const DEFAULT_DELAY_MS = 500
export const MIN_THRESHOLD = 0
export const MAX_THRESHOLD = 0.01
export const DEFAULT_THRESHOLD = 0.005

export const DEFAULT_ECHO_CONFIG: EchoConfig = {
  delayMs: DEFAULT_DELAY_MS,
  threshold: DEFAULT_THRESHOLD,
}

export function clampDelay(delayMs: number): number {
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delayMs))
}

export function clampThreshold(threshold: number): number {
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, threshold))
}

/** Maps threshold (0–0.01) to slider value (0–100, hundredths of a percent). */
export function thresholdToSensitivitySlider(threshold: number): number {
  return Math.round(clampThreshold(threshold) * 10_000)
}

/** Maps slider value (0–100) to threshold (0–0.01). */
export function sensitivitySliderToThreshold(sliderValue: number): number {
  return clampThreshold(sliderValue / 10_000)
}

export function formatSensitivityPercent(threshold: number): string {
  return (clampThreshold(threshold) * 100).toFixed(2)
}