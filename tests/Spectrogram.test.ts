import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Spectrogram } from '../src/ui/Spectrogram'
import { MockAnalyserNode } from './helpers/mockAudioContext'

describe('Spectrogram', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.width = '400px'
    document.body.appendChild(container)
  })

  it('renders a canvas with accessibility attributes', () => {
    new Spectrogram(container)

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('role')).toBe('img')
    expect(canvas!.getAttribute('aria-label')).toMatch(/spectrogram/i)
  })

  it('renders a legend after the panel', () => {
    new Spectrogram(container)

    const legend = container.nextElementSibling
    expect(legend?.className).toBe('spectrogram-legend')
    expect(legend?.textContent).toBe('Honk · Echo')
  })

  it('attaches input and output analysers for synced echo overlay', () => {
    const spectrogram = new Spectrogram(container)
    const inputAnalyser = new MockAnalyserNode()
    const outputAnalyser = new MockAnalyserNode()

    spectrogram.attach(
      inputAnalyser as unknown as AnalyserNode,
      outputAnalyser as unknown as AnalyserNode,
    )
    spectrogram.detach()
  })

  it('cancels animation when detach is called', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const spectrogram = new Spectrogram(container)
    const inputAnalyser = new MockAnalyserNode()
    const outputAnalyser = new MockAnalyserNode()

    spectrogram.attach(
      inputAnalyser as unknown as AnalyserNode,
      outputAnalyser as unknown as AnalyserNode,
    )
    spectrogram.detach()

    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })
})