export interface EchoConfig {
  delayMs: number
  threshold: number
}

export const MIN_DELAY_MS = 100
export const MAX_DELAY_MS = 3000
export const DEFAULT_DELAY_MS = 500
export const DEFAULT_THRESHOLD = 0.05

export const DEFAULT_ECHO_CONFIG: EchoConfig = {
  delayMs: DEFAULT_DELAY_MS,
  threshold: DEFAULT_THRESHOLD,
}

export function clampDelay(delayMs: number): number {
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delayMs))
}

export function clampThreshold(threshold: number): number {
  return Math.min(1, Math.max(0, threshold))
}