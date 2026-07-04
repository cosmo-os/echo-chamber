import { describe, expect, it } from 'vitest'
import { outputGainForLevel } from '../src/audio/volumeGate'

describe('outputGainForLevel', () => {
  it('returns zero when RMS is below threshold', () => {
    expect(outputGainForLevel(0.01, 0.05)).toBe(0)
  })

  it('returns one when RMS meets threshold', () => {
    expect(outputGainForLevel(0.05, 0.05)).toBe(1)
  })

  it('returns one when RMS is above threshold', () => {
    expect(outputGainForLevel(0.8, 0.05)).toBe(1)
  })
})