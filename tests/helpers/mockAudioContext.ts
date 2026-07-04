export class MockAudioNode {
  connectCalls: MockAudioNode[] = []

  connect(destination: MockAudioNode): MockAudioNode {
    this.connectCalls.push(destination)
    return destination
  }

  disconnect(): void {
    this.connectCalls = []
  }
}

export class MockDelayNode extends MockAudioNode {
  delayTime = { value: 0 }
  maxDelayTime = 1
}

export class MockAnalyserNode extends MockAudioNode {
  fftSize = 2048
  smoothingTimeConstant = 0.7
  frequencyBinCount = 1024
  private readonly frequencyData: Uint8Array

  constructor() {
    super()
    this.frequencyData = new Uint8Array(this.frequencyBinCount)
  }

  getByteFrequencyData(array: Uint8Array): void {
    array.set(this.frequencyData.subarray(0, array.length))
  }

  setFrequencyData(data: Uint8Array): void {
    this.frequencyData.set(data.subarray(0, this.frequencyBinCount))
  }
}

export class MockMediaStreamAudioSourceNode extends MockAudioNode {}

export class MockMediaStreamTrack {
  stopped = false

  stop(): void {
    this.stopped = true
  }
}

export class MockMediaStream {
  readonly tracks: MockMediaStreamTrack[]

  constructor(trackCount = 1) {
    this.tracks = Array.from({ length: trackCount }, () => new MockMediaStreamTrack())
  }

  getTracks(): MockMediaStreamTrack[] {
    return this.tracks
  }
}

export class MockAudioContext {
  readonly destination = new MockAudioNode()
  readonly delayNodes: MockDelayNode[] = []
  readonly sourceNodes: MockMediaStreamAudioSourceNode[] = []
  readonly analyserNodes: MockAnalyserNode[] = []
  readonly createDelayCalls: number[] = []
  closed = false
  state: AudioContextState = 'running'
  sampleRate = 48000

  createDelay(maxDelayTime = 1): MockDelayNode {
    this.createDelayCalls.push(maxDelayTime)
    const node = new MockDelayNode()
    node.maxDelayTime = maxDelayTime
    this.delayNodes.push(node)
    return node
  }

  createAnalyser(): MockAnalyserNode {
    const node = new MockAnalyserNode()
    this.analyserNodes.push(node)
    return node
  }

  createMediaStreamSource(_stream: MediaStream): MockMediaStreamAudioSourceNode {
    const node = new MockMediaStreamAudioSourceNode()
    this.sourceNodes.push(node)
    return node
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async close(): Promise<void> {
    this.closed = true
    this.state = 'closed'
  }
}

export function createMockMediaStream(): MockMediaStream {
  return new MockMediaStream()
}