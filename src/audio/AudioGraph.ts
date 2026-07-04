export interface EchoGraphConfig {
  delayMs: number
}

export interface EchoGraph {
  readonly source: MediaStreamAudioSourceNode
  readonly delayNode: DelayNode
  setDelayMs(delayMs: number): void
  dispose(): void
}

export function createEchoGraph(
  context: AudioContext,
  stream: MediaStream,
  config: EchoGraphConfig,
): EchoGraph {
  const source = context.createMediaStreamSource(stream)
  const delayNode = context.createDelay()
  delayNode.delayTime.value = config.delayMs / 1000

  source.connect(delayNode)
  delayNode.connect(context.destination)

  return {
    source,
    delayNode,
    setDelayMs(delayMs: number) {
      delayNode.delayTime.value = delayMs / 1000
    },
    dispose() {
      source.disconnect()
      delayNode.disconnect()
    },
  }
}