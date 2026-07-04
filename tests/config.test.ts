import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DELAY_MS,
  DEFAULT_ECHO_CONFIG,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  clampDelay,
} from '../src/types/config'

describe('config defaults', () => {
  it('uses 500ms as the default delay', () => {
    expect(DEFAULT_DELAY_MS).toBe(500)
  })

  it('provides a default echo config', () => {
    expect(DEFAULT_ECHO_CONFIG).toEqual({
      delayMs: DEFAULT_DELAY_MS,
    })
  })
})

describe('clampDelay', () => {
  it('returns values within bounds unchanged', () => {
    expect(clampDelay(500)).toBe(500)
  })

  it('clamps below minimum to 100ms', () => {
    expect(clampDelay(-1)).toBe(MIN_DELAY_MS)
    expect(MIN_DELAY_MS).toBe(100)
  })

  it('clamps above maximum to 3000ms', () => {
    expect(clampDelay(9999)).toBe(MAX_DELAY_MS)
    expect(MAX_DELAY_MS).toBe(3000)
  })
})