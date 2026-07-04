import { describe, expect, it } from 'vitest'
import { createEchoGraph } from '../src/audio/AudioGraph'
import {
  MockAudioContext,
  MockDelayNode,
  createMockMediaStream,
} from './helpers/mockAudioContext'

describe('createEchoGraph', () => {
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

  it('connects source through delay and gain to destination', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    createEchoGraph(context as unknown as AudioContext, stream, { delayMs: 500 })

    const source = context.sourceNodes[0]
    const delay = context.delayNodes[0]
    const gain = context.gainNodes[0]

    expect(source.connectCalls).toContain(delay)
    expect(source.connectCalls).toContain(context.analyserNodes[0])
    expect(delay.connectCalls[0]).toBe(gain)
    expect(gain.connectCalls[0]).toBe(context.destination)
  })

  it('reads RMS from the analyser tap', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 500 },
    )

    context.analyserNodes[0].fillValue = 1
    expect(graph.readInputRms()).toBeCloseTo(1, 5)
  })

  it('sets output gain on the gain node', () => {
    const context = new MockAudioContext()
    const stream = createMockMediaStream()

    const graph = createEchoGraph(
      context as unknown as AudioContext,
      stream,
      { delayMs: 500 },
    )

    graph.setOutputGain(0)
    expect(context.gainNodes[0].gain.value).toBe(0)
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
    source.connectCalls = [delay]
    delay.connectCalls = [context.destination]

    graph.dispose()

    expect(source.connectCalls).toEqual([])
    expect(delay.connectCalls).toEqual([])
  })
})