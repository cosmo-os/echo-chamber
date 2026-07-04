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

  return { stream, context, getUserMedia, createAudioContext }
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
      { delayMs: 750 },
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
})