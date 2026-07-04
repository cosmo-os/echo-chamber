import { computeRms } from './levelDetector.ts'

export interface EchoGraphConfig {
  delayMs: number
}

export interface EchoGraph {
  readonly source: MediaStreamAudioSourceNode
  readonly delayNode: DelayNode
  readonly analyserNode: AnalyserNode
  readonly gainNode: GainNode
  setDelayMs(delayMs: number): void
  readInputRms(): number
  setOutputGain(gain: number): void
  dispose(): void
}

const analyserBuffer = new Float32Array(2048)

export function createEchoGraph(
  context: AudioContext,
  stream: MediaStream,
  config: EchoGraphConfig,
): EchoGraph {
  const source = context.createMediaStreamSource(stream)
  const analyserNode = context.createAnalyser()
  const delayNode = context.createDelay()
  const gainNode = context.createGain()

  analyserNode.fftSize = 2048
  delayNode.delayTime.value = config.delayMs / 1000
  gainNode.gain.value = 0

  source.connect(analyserNode)
  source.connect(delayNode)
  delayNode.connect(gainNode)
  gainNode.connect(context.destination)

  return {
    source,
    delayNode,
    analyserNode,
    gainNode,
    setDelayMs(delayMs: number) {
      delayNode.delayTime.value = delayMs / 1000
    },
    readInputRms() {
      analyserNode.getFloatTimeDomainData(analyserBuffer)
      return computeRms(analyserBuffer)
    },
    setOutputGain(gain: number) {
      gainNode.gain.value = gain
    },
    dispose() {
      source.disconnect()
      analyserNode.disconnect()
      delayNode.disconnect()
      gainNode.disconnect()
    },
  }
}