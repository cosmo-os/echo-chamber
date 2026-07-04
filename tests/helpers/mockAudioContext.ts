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

export class MockAudioContext {
  readonly destination = new MockAudioNode()
  readonly delayNodes: MockDelayNode[] = []
  readonly sourceNodes: MockMediaStreamAudioSourceNode[] = []

  createDelay(): MockDelayNode {
    const node = new MockDelayNode()
    this.delayNodes.push(node)
    return node
  }

  createMediaStreamSource(_stream: MediaStream): MockMediaStreamAudioSourceNode {
    const node = new MockMediaStreamAudioSourceNode()
    this.sourceNodes.push(node)
    return node
  }
}

export function createMockMediaStream(): MediaStream {
  return {} as MediaStream
}