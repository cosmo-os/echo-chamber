import { MAX_DELAY_MS } from '../types/config.ts'

export interface EchoGraphConfig {
  delayMs: number
}

export interface EchoGraph {
  readonly source: MediaStreamAudioSourceNode
  readonly delayNode: DelayNode
  readonly inputAnalyser: AnalyserNode
  readonly outputAnalyser: AnalyserNode
  setDelayMs(delayMs: number): void
  dispose(): void
}

export function createEchoGraph(
  context: AudioContext,
  stream: MediaStream,
  config: EchoGraphConfig,
): EchoGraph {
  const source = context.createMediaStreamSource(stream)
  const delayNode = context.createDelay(MAX_DELAY_MS / 1000)
  delayNode.delayTime.value = config.delayMs / 1000

  const inputAnalyser = context.createAnalyser()
  inputAnalyser.fftSize = 2048
  inputAnalyser.smoothingTimeConstant = 0.3

  const outputAnalyser = context.createAnalyser()
  outputAnalyser.fftSize = 2048
  outputAnalyser.smoothingTimeConstant = 0.7

  source.connect(delayNode)
  delayNode.connect(context.destination)
  source.connect(inputAnalyser)
  delayNode.connect(outputAnalyser)

  return {
    source,
    delayNode,
    inputAnalyser,
    outputAnalyser,
    setDelayMs(delayMs: number) {
      delayNode.delayTime.value = delayMs / 1000
    },
    dispose() {
      source.disconnect()
      delayNode.disconnect()
      inputAnalyser.disconnect()
      outputAnalyser.disconnect()
    },
  }
}