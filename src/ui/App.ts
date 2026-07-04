import {
  DEFAULT_DELAY_MS,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
} from '../types/config.ts'
import { Spectrogram } from './Spectrogram.ts'

export type AppEngine = {
  isRunning: boolean
  start(): Promise<void>
  stop(): void
  setDelayMs(delayMs: number): void
  getAnalyserNodes(): { input: AnalyserNode; output: AnalyserNode } | null
}

export class App {
  private engine: AppEngine | null = null
  private delayMs = DEFAULT_DELAY_MS
  private statusEl!: HTMLParagraphElement
  private delaySliderEl!: HTMLInputElement
  private delayValueEl!: HTMLSpanElement
  private toggleButtonEl!: HTMLButtonElement
  private spectrogram!: Spectrogram

  private readonly root: HTMLElement
  private readonly getEngine: () => AppEngine

  constructor(root: HTMLElement, getEngine: () => AppEngine) {
    this.root = root
    this.getEngine = getEngine
    this.render()
    this.bindEvents()
  }

  async clickStart(): Promise<void> {
    this.toggleButtonEl.click()
    await this.pendingStart
  }

  clickStop(): void {
    this.toggleButtonEl.click()
  }

  setDelaySlider(value: number): void {
    this.delaySliderEl.value = String(value)
    this.delaySliderEl.dispatchEvent(new Event('input'))
  }

  getStatusText(): string {
    return this.statusEl.textContent ?? ''
  }

  getDelayValue(): number {
    return Number(this.delaySliderEl.value)
  }

  private pendingStart: Promise<void> = Promise.resolve()

  private render(): void {
    this.root.innerHTML = `
      <main class="shell">
        <h1>Honk Chamber</h1>
        <p class="tagline">Honk, clap, or cause a ruckus — hear it echoed back.</p>
        <p class="status" role="status">Ready to make trouble? Tap Honk! and allow microphone access.</p>
        <div class="spectrogram-panel"></div>
        <div class="controls">
          <label class="delay-control" for="delay">
            Delay
            <span class="delay-value">${DEFAULT_DELAY_MS}</span>
            ms
          </label>
          <input
            id="delay"
            class="delay-slider"
            type="range"
            min="${MIN_DELAY_MS}"
            max="${MAX_DELAY_MS}"
            step="50"
            value="${DEFAULT_DELAY_MS}"
          />
          <button id="toggle" type="button" class="primary-button">Honk!</button>
        </div>
      </main>
    `

    this.statusEl = this.root.querySelector('.status')!
    this.delaySliderEl = this.root.querySelector('#delay')!
    this.delayValueEl = this.root.querySelector('.delay-value')!
    this.toggleButtonEl = this.root.querySelector('#toggle')!

    const spectrogramPanel = this.root.querySelector('.spectrogram-panel') as HTMLElement
    this.spectrogram = new Spectrogram(spectrogramPanel)
  }

  private bindEvents(): void {
    this.toggleButtonEl.addEventListener('click', () => {
      this.pendingStart = this.handleToggle()
    })

    this.delaySliderEl.addEventListener('input', () => {
      this.delayMs = Number(this.delaySliderEl.value)
      this.delayValueEl.textContent = String(this.delayMs)
      this.getEngineInstance().setDelayMs(this.delayMs)
    })
  }

  private getEngineInstance(): AppEngine {
    this.engine ??= this.getEngine()
    return this.engine
  }

  private async handleToggle(): Promise<void> {
    const engine = this.getEngineInstance()

    if (engine.isRunning) {
      engine.stop()
      this.spectrogram.detach()
      this.setStatus('The goose is resting.')
      this.updateToggleButton(false)
      return
    }

    try {
      await engine.start()
      const analysers = engine.getAnalyserNodes()
      if (analysers) {
        this.spectrogram.attach(analysers.input, analysers.output)
      }
      this.setStatus('The goose is listening — make a sound and hear your echo.')
      this.updateToggleButton(true)
    } catch (error) {
      this.spectrogram.detach()
      this.handleStartError(error)
    }
  }

  private handleStartError(error: unknown): void {
    const name = error instanceof Error ? error.name : ''

    if (name === 'NotAllowedError') {
      this.setStatus('Microphone permission denied. Allow access and try again.', true)
      return
    }

    if (name === 'NotFoundError') {
      this.setStatus('No microphone found. Connect a mic and try again.', true)
      return
    }

    this.setStatus('Could not start echo. Check your microphone and try again.', true)
  }

  private setStatus(message: string, isError = false): void {
    this.statusEl.textContent = message
    this.statusEl.classList.toggle('status-error', isError)
  }

  private updateToggleButton(isRunning: boolean): void {
    this.toggleButtonEl.textContent = isRunning ? 'Shh...' : 'Honk!'
    this.toggleButtonEl.setAttribute('aria-pressed', String(isRunning))
  }
}