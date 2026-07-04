import { describe, expect, it, vi } from 'vitest'
import { EchoEngine } from '../src/audio/EchoEngine'
import { DEFAULT_DELAY_MS } from '../src/types/config'
import {
  MockAudioContext,
  MockDelayNode,
  createMockMediaStream,
} from './helpers/mockAudioContext'

function createTestDeps() {
  const stream = createMockMediaStream()
  const context = new MockAudioContext()
  const getUserMedia = vi.fn(async () => stream as unknown as MediaStream)
  const createAudioContext = vi.fn(() => context as unknown as AudioContext)
  let frameCallback: (() => void) | null = null
  const scheduler = {
    requestFrame: vi.fn((callback: () => void) => {
      frameCallback = callback
      return 1
    }),
    cancelFrame: vi.fn(() => {
      frameCallback = null
    }),
  }

  const runFrame = () => {
    frameCallback?.()
  }

  return { stream, context, getUserMedia, createAudioContext, scheduler, runFrame }
}

describe('EchoEngine', () => {
  it('start requests the microphone and builds the echo graph', async () => {
    const { getUserMedia, createAudioContext, context } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext })

    await engine.start()

    expect(getUserMedia).toHaveBeenCalledOnce()
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(createAudioContext).toHaveBeenCalledOnce()
    expect(context.sourceNodes).toHaveLength(1)
    expect(context.delayNodes).toHaveLength(1)
    expect(engine.isRunning).toBe(true)
  })

  it('sets initial delay from config on the graph', async () => {
    const { getUserMedia, createAudioContext, context } = createTestDeps()
    const engine = new EchoEngine(
      { getUserMedia, createAudioContext },
      { delayMs: 750, threshold: 0.1 },
    )

    await engine.start()

    const delayNode = context.delayNodes[0] as MockDelayNode
    expect(delayNode.delayTime.value).toBe(0.75)
  })

  it('stop disconnects the graph, closes the context, and stops tracks', async () => {
    const { getUserMedia, createAudioContext, context, stream } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext })

    await engine.start()
    engine.stop()

    expect(context.closed).toBe(true)
    expect(stream.tracks.every((track) => track.stopped)).toBe(true)
    expect(engine.isRunning).toBe(false)
  })

  it('can start again after stop', async () => {
    const { getUserMedia, createAudioContext } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext })

    await engine.start()
    engine.stop()
    await engine.start()

    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(createAudioContext).toHaveBeenCalledTimes(2)
    expect(engine.isRunning).toBe(true)
  })

  it('does not request the microphone again if already running', async () => {
    const { getUserMedia, createAudioContext } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext })

    await engine.start()
    await engine.start()

    expect(getUserMedia).toHaveBeenCalledOnce()
    expect(createAudioContext).toHaveBeenCalledOnce()
  })

  it('updates delay on the running graph when setDelayMs is called', async () => {
    const { getUserMedia, createAudioContext, context } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext })

    await engine.start()
    engine.setDelayMs(1200)

    const delayNode = context.delayNodes[0] as MockDelayNode
    expect(delayNode.delayTime.value).toBe(1.2)
  })

  it('uses default delay when config is omitted', async () => {
    const { getUserMedia, createAudioContext, context } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext })

    await engine.start()

    const delayNode = context.delayNodes[0] as MockDelayNode
    expect(delayNode.delayTime.value).toBe(DEFAULT_DELAY_MS / 1000)
  })

  it('mutes output when input is below threshold', async () => {
    const { getUserMedia, createAudioContext, context, scheduler, runFrame } =
      createTestDeps()
    const engine = new EchoEngine(
      { getUserMedia, createAudioContext, scheduler },
      { delayMs: 500, threshold: 0.008 },
    )

    await engine.start()
    context.analyserNodes[0].fillValue = 0
    runFrame()

    expect(context.gainNodes[0].gain.value).toBe(0)
  })

  it('unmutes output when input is above threshold', async () => {
    const { getUserMedia, createAudioContext, context, scheduler, runFrame } =
      createTestDeps()
    const engine = new EchoEngine(
      { getUserMedia, createAudioContext, scheduler },
      { delayMs: 500, threshold: 0.005 },
    )

    await engine.start()
    context.analyserNodes[0].fillValue = 1
    runFrame()

    expect(context.gainNodes[0].gain.value).toBe(1)
  })

  it('updates threshold while running', async () => {
    const { getUserMedia, createAudioContext, context, scheduler, runFrame } =
      createTestDeps()
    const engine = new EchoEngine(
      { getUserMedia, createAudioContext, scheduler },
      { delayMs: 500, threshold: 0.008 },
    )

    await engine.start()
    context.analyserNodes[0].fillValue = 0.005
    engine.setThreshold(0.004)
    runFrame()

    expect(context.gainNodes[0].gain.value).toBe(1)
  })

  it('cancels the gating loop on stop', async () => {
    const { getUserMedia, createAudioContext, scheduler } = createTestDeps()
    const engine = new EchoEngine({ getUserMedia, createAudioContext, scheduler })

    await engine.start()
    engine.stop()

    expect(scheduler.cancelFrame).toHaveBeenCalledWith(1)
  })
})