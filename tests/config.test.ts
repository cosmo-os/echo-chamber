import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DELAY_MS,
  DEFAULT_ECHO_CONFIG,
  DEFAULT_THRESHOLD,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  clampDelay,
  clampThreshold,
} from '../src/types/config'

describe('config defaults', () => {
  it('uses 500ms as the default delay', () => {
    expect(DEFAULT_DELAY_MS).toBe(500)
  })

  it('uses a threshold between 0 and 1', () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(1)
  })

  it('provides a default echo config with clamped values', () => {
    expect(DEFAULT_ECHO_CONFIG).toEqual({
      delayMs: DEFAULT_DELAY_MS,
      threshold: DEFAULT_THRESHOLD,
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

describe('clampThreshold', () => {
  it('returns values within bounds unchanged', () => {
    expect(clampThreshold(0.5)).toBe(0.5)
  })

  it('clamps below zero to 0', () => {
    expect(clampThreshold(-0.1)).toBe(0)
  })

  it('clamps above one to 1', () => {
    expect(clampThreshold(1.5)).toBe(1)
  })
})