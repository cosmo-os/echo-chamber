import { describe, expect, it } from 'vitest'
import { computeRms, isAboveThreshold } from '../src/audio/levelDetector'

describe('computeRms', () => {
  it('returns zero for silence', () => {
    const silence = new Float32Array(128)
    expect(computeRms(silence)).toBe(0)
  })

  it('returns full scale for a constant signal at 1.0', () => {
    const fullScale = new Float32Array(128).fill(1)
    expect(computeRms(fullScale)).toBeCloseTo(1, 5)
  })

  it('returns full scale for a constant signal at -1.0', () => {
    const inverted = new Float32Array(128).fill(-1)
    expect(computeRms(inverted)).toBeCloseTo(1, 5)
  })

  it('computes RMS for mixed samples', () => {
    const samples = new Float32Array([0.5, 0.5, 0.5, 0.5])
    expect(computeRms(samples)).toBeCloseTo(0.5, 5)
  })

  it('returns zero for an empty buffer', () => {
    expect(computeRms(new Float32Array(0))).toBe(0)
  })
})

describe('isAboveThreshold', () => {
  it('returns false when RMS is below threshold', () => {
    expect(isAboveThreshold(0, 0.5)).toBe(false)
  })

  it('returns true when RMS is above threshold', () => {
    expect(isAboveThreshold(1, 0.5)).toBe(true)
  })

  it('returns true when RMS equals threshold', () => {
    expect(isAboveThreshold(0.5, 0.5)).toBe(true)
  })
})