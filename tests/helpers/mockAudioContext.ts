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
}

export class MockMediaStreamAudioSourceNode extends MockAudioNode {}

export class MockAnalyserNode extends MockAudioNode {
  fillValue = 0

  getFloatTimeDomainData(array: Float32Array): void {
    array.fill(this.fillValue)
  }
}

export class MockGainNode extends MockAudioNode {
  gain = { value: 1 }
}

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
  readonly gainNodes: MockGainNode[] = []
  closed = false
  state: AudioContextState = 'running'

  createDelay(): MockDelayNode {
    const node = new MockDelayNode()
    this.delayNodes.push(node)
    return node
  }

  createAnalyser(): MockAnalyserNode {
    const node = new MockAnalyserNode()
    this.analyserNodes.push(node)
    return node
  }

  createGain(): MockGainNode {
    const node = new MockGainNode()
    this.gainNodes.push(node)
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