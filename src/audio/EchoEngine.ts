import { createEchoGraph, type EchoGraph } from './AudioGraph.ts'
import {
  clampDelay,
  DEFAULT_ECHO_CONFIG,
  type EchoConfig,
} from '../types/config.ts'

export type EchoEngineDeps = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  createAudioContext: () => AudioContext
}

export class EchoEngine {
  private config: EchoConfig
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private graph: EchoGraph | null = null
  private readonly deps: EchoEngineDeps

  constructor(deps: EchoEngineDeps, config: EchoConfig = DEFAULT_ECHO_CONFIG) {
    this.deps = deps
    this.config = { ...config }
  }

  get isRunning(): boolean {
    return this.graph !== null
  }

  getAnalyserNodes(): { input: AnalyserNode; output: AnalyserNode } | null {
    if (!this.graph) {
      return null
    }

    return {
      input: this.graph.inputAnalyser,
      output: this.graph.outputAnalyser,
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.stream = await this.deps.getUserMedia({ audio: true })
    this.context = this.deps.createAudioContext()

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    this.graph = createEchoGraph(this.context, this.stream, {
      delayMs: clampDelay(this.config.delayMs),
    })
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.graph!.dispose()
    void this.context!.close()
    this.stream!.getTracks().forEach((track) => track.stop())

    this.graph = null
    this.context = null
    this.stream = null
  }

  setDelayMs(delayMs: number): void {
    this.config.delayMs = clampDelay(delayMs)

    if (this.graph) {
      this.graph.setDelayMs(this.config.delayMs)
    }
  }
}