import { createEchoGraph, type EchoGraph } from './AudioGraph.ts'
import { outputGainForLevel } from './volumeGate.ts'
import {
  clampDelay,
  clampThreshold,
  DEFAULT_ECHO_CONFIG,
  type EchoConfig,
} from '../types/config.ts'

export type FrameScheduler = {
  requestFrame(callback: () => void): number
  cancelFrame(id: number): void
}

export type EchoEngineDeps = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  createAudioContext: () => AudioContext
  scheduler?: FrameScheduler
}

const defaultScheduler: FrameScheduler = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
}

export class EchoEngine {
  private config: EchoConfig
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private graph: EchoGraph | null = null
  private readonly deps: EchoEngineDeps
  private readonly scheduler: FrameScheduler
  private gatingFrameId: number | null = null

  constructor(deps: EchoEngineDeps, config: EchoConfig = DEFAULT_ECHO_CONFIG) {
    this.deps = deps
    this.scheduler = deps.scheduler ?? defaultScheduler
    this.config = { ...config }
  }

  get isRunning(): boolean {
    return this.graph !== null
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
    this.startGating()
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.stopGating()
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

  setThreshold(threshold: number): void {
    this.config.threshold = clampThreshold(threshold)
  }

  private startGating(): void {
    const tick = () => {
      if (!this.graph) {
        return
      }

      const rms = this.graph.readInputRms()
      const gain = outputGainForLevel(rms, this.config.threshold)
      this.graph.setOutputGain(gain)
      this.gatingFrameId = this.scheduler.requestFrame(tick)
    }

    tick()
  }

  private stopGating(): void {
    if (this.gatingFrameId !== null) {
      this.scheduler.cancelFrame(this.gatingFrameId)
      this.gatingFrameId = null
    }
  }
}