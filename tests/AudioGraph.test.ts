import { describe, expect, it } from 'vitest'
import { createEchoGraph } from '../src/audio/AudioGraph'
import { MAX_DELAY_MS } from '../src/types/config'
import {
  MockAnalyserNode,
  MockAudioContext,
  MockDelayNode,
  createMockMediaStream,
} from './helpers/mockAudioContext'

describe('createEchoGraph', () => {
  it('creates a delay node with max delay matching config', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    createEchoGraph(context as unknown as AudioContext, stream, { delayMs: 500 })

    expect(context.createDelayCalls[0]).toBe(MAX_DELAY_MS / 1000)
  })

  it('sets delay time from config in seconds', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 500 },
    )

    const delayNode = graph.delayNode as unknown as MockDelayNode
    expect(delayNode.delayTime.value).toBe(0.5)
  })

  it('connects source through delay to destination', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    createEchoGraph(context as unknown as AudioContext, stream, { delayMs: 500 })

    const source = context.sourceNodes[0]
    const delay = context.delayNodes[0]

    expect(source.connectCalls[0]).toBe(delay)
    expect(delay.connectCalls[0]).toBe(context.destination)
  })

  it('creates parallel analyser taps from source and delay', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 500 },
    )

    const source = context.sourceNodes[0]
    const delay = context.delayNodes[0]
    const inputAnalyser = graph.inputAnalyser as unknown as MockAnalyserNode
    const outputAnalyser = graph.outputAnalyser as unknown as MockAnalyserNode

    expect(context.analyserNodes).toHaveLength(2)
    expect(source.connectCalls).toContain(inputAnalyser)
    expect(delay.connectCalls).toContain(outputAnalyser)
    expect(inputAnalyser.fftSize).toBe(2048)
    expect(outputAnalyser.fftSize).toBe(2048)
  })

  it('updates delay time when setDelayMs is called', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 500 },
    )

    graph.setDelayMs(1000)

    const delayNode = graph.delayNode as unknown as MockDelayNode
    expect(delayNode.delayTime.value).toBe(1)
  })

  it('supports delays above the default 1 second max', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 2500 },
    )

    const delayNode = graph.delayNode as unknown as MockDelayNode
    expect(delayNode.delayTime.value).toBe(2.5)

    graph.setDelayMs(3000)
    expect(delayNode.delayTime.value).toBe(3)
  })

  it('disconnects nodes on dispose', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 500 },
    )

    const source = context.sourceNodes[0]
    const delay = context.delayNodes[0]
    const inputAnalyser = graph.inputAnalyser as unknown as MockAnalyserNode
    const outputAnalyser = graph.outputAnalyser as unknown as MockAnalyserNode
    source.connectCalls = [delay, inputAnalyser]
    delay.connectCalls = [context.destination, outputAnalyser]

    graph.dispose()

    expect(source.connectCalls).toEqual([])
    expect(delay.connectCalls).toEqual([])
    expect(inputAnalyser.connectCalls).toEqual([])
    expect(outputAnalyser.connectCalls).toEqual([])
  })
})