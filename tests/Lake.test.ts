import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifySoundEvent,
  classifySoundVolume,
  computeBarkScore,
  computeWaveformRms,
  computeZeroCrossingRate,
  Lake,
} from '../src/ui/Lake'
import { MockAnalyserNode } from './helpers/mockAudioContext'

function waveformWithAmplitude(amplitude: number, length = 256): Uint8Array {
  const data = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    const wave = Math.sin((i / length) * Math.PI * 8)
    data[i] = Math.round(128 + wave * amplitude * 127)
  }
  return data
}

function waveformWithFrequency(hz: number, amplitude: number, sampleRate: number, length = 256): Uint8Array {
  const data = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    const wave = Math.sin((i / sampleRate) * hz * Math.PI * 2)
    data[i] = Math.round(128 + wave * amplitude * 127)
  }
  return data
}

function spectrumWithPeakBin(peakBin: number, peakValue: number, length = 1024): Uint8Array {
  const data = new Uint8Array(length)
  data.fill(8)
  data[peakBin] = peakValue
  return data
}

function barkLikeSpectrum(length = 1024): Uint8Array {
  const data = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    const hz = (i * 48000) / (length * 2)
    if (hz >= 500 && hz <= 2200) {
      data[i] = 180 + (i % 17)
    } else if (hz < 300) {
      data[i] = 18
    } else {
      data[i] = 40
    }
  }
  return data
}

function honkLikeSpectrum(length = 1024): Uint8Array {
  const data = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    const hz = (i * 48000) / (length * 2)
    if (hz < 280) {
      data[i] = 210
    } else if (hz < 700) {
      data[i] = 90
    } else {
      data[i] = 20
    }
  }
  return data
}

describe('Lake', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.width = '400px'
    document.body.appendChild(container)
  })

  it('renders a canvas with accessibility attributes', () => {
    new Lake(container)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('role')).toBe('img')
    expect(canvas!.getAttribute('aria-label')).toMatch(/lake/i)
    expect(canvas!.getAttribute('aria-label')).toMatch(/honks/i)
  })

  it('renders a legend after the panel', () => {
    new Lake(container)

    const legend = container.nextElementSibling
    expect(legend?.className).toContain('lake-legend')
    expect(legend?.textContent).toBe('SELECT = aim  ·  A = shoot  ·  HONK / PEEP / WOOF')
  })

  it('attaches input analyser and starts the render loop', () => {
    const lake = new Lake(container)
    const inputAnalyser = new MockAnalyserNode()
    const outputAnalyser = new MockAnalyserNode()

    lake.attach(
      inputAnalyser as unknown as AnalyserNode,
      outputAnalyser as unknown as AnalyserNode,
    )
    lake.detach()
  })

  it('classifies quiet peaks as eggs and loud peaks as flying geese', () => {
    expect(classifySoundVolume(0.06)).toBe('egg')
    expect(classifySoundVolume(0.09)).toBe('egg')
    expect(classifySoundVolume(0.12)).toBe('goose')
    expect(classifySoundVolume(0.25)).toBe('goose')
  })

  it('classifies bark-like spectra and transients as dog barks', () => {
    const barkWave = waveformWithFrequency(1200, 0.35, 48000, 2048)
    const honkWave = waveformWithFrequency(180, 0.45, 48000, 2048)
    const barkScore = computeBarkScore(barkLikeSpectrum(), 48000)
    const honkScore = computeBarkScore(honkLikeSpectrum(), 48000)
    const barkZcr = computeZeroCrossingRate(barkWave)
    const honkZcr = computeZeroCrossingRate(honkWave)

    expect(barkScore).toBeGreaterThan(honkScore)
    expect(barkZcr).toBeGreaterThan(honkZcr)
    expect(classifySoundEvent(0.18, barkScore, barkZcr)).toBe('bark')
    expect(classifySoundEvent(0.22, honkScore, honkZcr)).toBe('goose')
  })

  it('computes RMS from waveform amplitude', () => {
    const quiet = computeWaveformRms(waveformWithAmplitude(0.12))
    const loud = computeWaveformRms(waveformWithAmplitude(0.55))

    expect(quiet).toBeLessThan(0.1)
    expect(loud).toBeGreaterThan(0.1)
    expect(loud).toBeGreaterThan(quiet)
  })

  it('toggles crosshairs and keeps aim inside the lake water', () => {
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 400,
      height: 360,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 360,
      toJSON: () => ({}),
    } as DOMRect)

    const lake = new Lake(container)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    const arm = Math.max(8, canvas.height * 0.028)
    const lakeTop = Math.floor(canvas.height * 0.473)
    const lakeX = Math.floor(canvas.width * 0.06)
    const lakeW = Math.floor(canvas.width * 0.88)
    const lakeH = Math.max(1, canvas.height - lakeTop - Math.floor(canvas.height * 0.02))

    expect(lake.isCrosshairsActive()).toBe(false)
    lake.setCrosshairsActive(true)
    expect(lake.isCrosshairsActive()).toBe(true)

    for (let i = 0; i < 80; i++) {
      lake.moveCrosshairs(1, 1)
    }
    for (let i = 0; i < 80; i++) {
      lake.moveCrosshairs(-1, -1)
    }

    const pos = lake.getCrosshairCanvasPosition()
    expect(pos.x).toBeGreaterThanOrEqual(lakeX + arm - 1)
    expect(pos.x).toBeLessThanOrEqual(lakeX + lakeW - arm + 1)
    expect(pos.y).toBeGreaterThanOrEqual(lakeTop + arm - 1)
    expect(pos.y).toBeLessThanOrEqual(lakeTop + lakeH - arm + 1)
    expect(lake.shootAtCrosshairs()).toBe(false)
  })

  it('cancels animation when detach is called', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const lake = new Lake(container)
    const inputAnalyser = new MockAnalyserNode()
    const outputAnalyser = new MockAnalyserNode()

    lake.attach(
      inputAnalyser as unknown as AnalyserNode,
      outputAnalyser as unknown as AnalyserNode,
    )
    lake.detach()

    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })
})