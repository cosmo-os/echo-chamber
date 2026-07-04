import {
  DEFAULT_DELAY_MS,
  DEFAULT_THRESHOLD,
  formatSensitivityPercent,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
  sensitivitySliderToThreshold,
  thresholdToSensitivitySlider,
} from '../types/config.ts'

export type AppEngine = {
  isRunning: boolean
  start(): Promise<void>
  stop(): void
  setDelayMs(delayMs: number): void
  setThreshold(threshold: number): void
}

export class App {
  private engine: AppEngine | null = null
  private delayMs = DEFAULT_DELAY_MS
  private statusEl!: HTMLParagraphElement
  private delaySliderEl!: HTMLInputElement
  private delayValueEl!: HTMLSpanElement
  private sensitivitySliderEl!: HTMLInputElement
  private sensitivityValueEl!: HTMLSpanElement
  private toggleButtonEl!: HTMLButtonElement
  private threshold = DEFAULT_THRESHOLD

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

  setSensitivitySlider(percent: number): void {
    this.sensitivitySliderEl.value = String(percent)
    this.sensitivitySliderEl.dispatchEvent(new Event('input'))
  }

  getSensitivityValue(): number {
    return Number(this.sensitivitySliderEl.value)
  }

  private pendingStart: Promise<void> = Promise.resolve()

  private render(): void {
    this.root.innerHTML = `
      <main class="shell">
        <h1>Echo Chamber</h1>
        <p class="tagline">Speak, clap, or make a sound — hear it echoed back.</p>
        <p class="status" role="status">Tap Start and allow microphone access.</p>
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
          <label class="delay-control" for="sensitivity">
            Sensitivity
            <span class="sensitivity-value">${formatSensitivityPercent(DEFAULT_THRESHOLD)}</span>
            %
          </label>
          <input
            id="sensitivity"
            class="delay-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value="${thresholdToSensitivitySlider(DEFAULT_THRESHOLD)}"
          />
          <button id="toggle" type="button" class="primary-button">Start</button>
        </div>
      </main>
    `

    this.statusEl = this.root.querySelector('.status')!
    this.delaySliderEl = this.root.querySelector('#delay')!
    this.delayValueEl = this.root.querySelector('.delay-value')!
    this.sensitivitySliderEl = this.root.querySelector('#sensitivity')!
    this.sensitivityValueEl = this.root.querySelector('.sensitivity-value')!
    this.toggleButtonEl = this.root.querySelector('#toggle')!
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

    this.sensitivitySliderEl.addEventListener('input', () => {
      const sliderValue = Number(this.sensitivitySliderEl.value)
      this.threshold = sensitivitySliderToThreshold(sliderValue)
      this.sensitivityValueEl.textContent = formatSensitivityPercent(this.threshold)
      this.getEngineInstance().setThreshold(this.threshold)
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
      this.setStatus('Stopped.')
      this.updateToggleButton(false)
      return
    }

    try {
      await engine.start()
      this.setStatus('Listening — speak and hear your echo.')
      this.updateToggleButton(true)
    } catch (error) {
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
    this.toggleButtonEl.textContent = isRunning ? 'Stop' : 'Start'
    this.toggleButtonEl.setAttribute('aria-pressed', String(isRunning))
  }
}