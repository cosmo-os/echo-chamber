import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DELAY_MS,
  DEFAULT_ECHO_CONFIG,
  DEFAULT_THRESHOLD,
  MAX_DELAY_MS,
  MAX_THRESHOLD,
  MIN_DELAY_MS,
  MIN_THRESHOLD,
  clampDelay,
  clampThreshold,
  sensitivitySliderToThreshold,
  thresholdToSensitivitySlider,
} from '../src/types/config'

describe('config defaults', () => {
  it('uses 500ms as the default delay', () => {
    expect(DEFAULT_DELAY_MS).toBe(500)
  })

  it('uses a threshold within the 0–1% useful range', () => {
    expect(DEFAULT_THRESHOLD).toBeGreaterThanOrEqual(MIN_THRESHOLD)
    expect(DEFAULT_THRESHOLD).toBeLessThanOrEqual(MAX_THRESHOLD)
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
    expect(clampThreshold(0.005)).toBe(0.005)
  })

  it('clamps below zero to 0', () => {
    expect(clampThreshold(-0.1)).toBe(MIN_THRESHOLD)
  })

  it('clamps above maximum to 1%', () => {
    expect(clampThreshold(0.5)).toBe(MAX_THRESHOLD)
    expect(MAX_THRESHOLD).toBe(0.01)
  })
})

describe('sensitivity slider mapping', () => {
  it('maps slider endpoints to 0% and 1%', () => {
    expect(sensitivitySliderToThreshold(0)).toBe(0)
    expect(sensitivitySliderToThreshold(100)).toBe(0.01)
  })

  it('round-trips default threshold through the slider', () => {
    expect(thresholdToSensitivitySlider(DEFAULT_THRESHOLD)).toBe(50)
    expect(sensitivitySliderToThreshold(50)).toBe(DEFAULT_THRESHOLD)
  })
})