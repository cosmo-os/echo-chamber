export interface EchoConfig {
  delayMs: number
}

export const MIN_DELAY_MS = 100
export const MAX_DELAY_MS = 3000
export const DEFAULT_DELAY_MS = 500

export const DEFAULT_ECHO_CONFIG: EchoConfig = {
  delayMs: DEFAULT_DELAY_MS,
}

export function clampDelay(delayMs: number): number {
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, delayMs))
}