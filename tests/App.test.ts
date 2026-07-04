import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App, type AppEngine } from '../src/ui/App'
import { DEFAULT_DELAY_MS } from '../src/types/config'
import { MockAnalyserNode } from './helpers/mockAudioContext'

function createMockEngine(overrides: Partial<AppEngine> = {}): AppEngine {
  const inputAnalyser = new MockAnalyserNode()
  const outputAnalyser = new MockAnalyserNode()

  return {
    isRunning: false,
    start: vi.fn(async () => {}),
    stop: vi.fn(),
    setDelayMs: vi.fn(),
    getAnalyserNodes: vi.fn(() => ({ input: inputAnalyser, output: outputAnalyser })),
    ...overrides,
  }
}

describe('App', () => {
  let root: HTMLDivElement

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })

  it('calls engine.start when Start is clicked', async () => {
    const engine = createMockEngine()
    const app = new App(root, () => engine)

    await app.clickStart()

    expect(engine.start).toHaveBeenCalledOnce()
  })

  it('calls engine.stop when Stop is clicked while running', async () => {
    const engine = createMockEngine({
      start: vi.fn(async () => {
        engine.isRunning = true
      }),
      stop: vi.fn(() => {
        engine.isRunning = false
      }),
    })
    const app = new App(root, () => engine)

    await app.clickStart()
    app.clickStop()

    expect(engine.stop).toHaveBeenCalledOnce()
  })

  it('calls setDelayMs when the delay slider changes', async () => {
    const engine = createMockEngine()
    const app = new App(root, () => engine)

    app.setDelaySlider(1200)

    expect(engine.setDelayMs).toHaveBeenCalledWith(1200)
  })

  it('shows a permission denied message for NotAllowedError', async () => {
    const engine = createMockEngine({
      start: vi.fn(async () => {
        throw Object.assign(new Error('denied'), { name: 'NotAllowedError' })
      }),
    })
    const app = new App(root, () => engine)

    await app.clickStart()

    expect(app.getStatusText()).toMatch(/permission/i)
  })

  it('shows a no microphone message for NotFoundError', async () => {
    const engine = createMockEngine({
      start: vi.fn(async () => {
        throw Object.assign(new Error('not found'), { name: 'NotFoundError' })
      }),
    })
    const app = new App(root, () => engine)

    await app.clickStart()

    expect(app.getStatusText()).toMatch(/microphone/i)
  })

  it('renders with the default delay value', () => {
    const engine = createMockEngine()
    const app = new App(root, () => engine)

    expect(app.getDelayValue()).toBe(DEFAULT_DELAY_MS)
  })

  it('renders a spectrogram canvas in the layout', () => {
    const engine = createMockEngine()
    new App(root, () => engine)

    expect(root.querySelector('.spectrogram-panel')).not.toBeNull()
    expect(root.querySelector('.spectrogram-canvas')).not.toBeNull()
    expect(root.querySelector('.spectrogram-legend')).not.toBeNull()
  })

  it('attaches the spectrogram after start and detaches on stop', async () => {
    const engine = createMockEngine({
      start: vi.fn(async () => {
        engine.isRunning = true
      }),
      stop: vi.fn(() => {
        engine.isRunning = false
      }),
    })
    const app = new App(root, () => engine)

    await app.clickStart()
    expect(engine.getAnalyserNodes).toHaveBeenCalled()

    app.clickStop()
    expect(engine.stop).toHaveBeenCalledOnce()
  })
})