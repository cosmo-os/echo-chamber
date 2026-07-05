import {
  DEFAULT_DELAY_MS,
  MAX_DELAY_MS,
  MIN_DELAY_MS,
} from '../types/config.ts'
import { Lake } from './Lake.ts'

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
  private startButtonEl!: HTMLButtonElement
  private selectButtonEl!: HTMLButtonElement
  private btnAEl!: HTMLButtonElement
  private lake!: Lake
  private keyHandler: ((event: KeyboardEvent) => void) | null = null

  private readonly root: HTMLElement
  private readonly getEngine: () => AppEngine

  constructor(root: HTMLElement, getEngine: () => AppEngine) {
    this.root = root
    this.getEngine = getEngine
    this.render()
    this.bindEvents()
  }

  async clickStart(): Promise<void> {
    this.startButtonEl.click()
    await this.pendingStart
  }

  clickStop(): void {
    this.startButtonEl.click()
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
      <main class="handheld">
        <div class="gb-device">
          <div class="gb-screen-section">
            <p class="gb-brand">✦ goose lake ✦</p>
            <div class="screen-bezel">
              <p class="status lcd-text" role="status">PRESS START · ALLOW MIC</p>
              <div class="lake-panel"></div>
            </div>
          </div>

          <div class="gamepad">
            <div class="dpad-cluster">
              <div class="dpad" role="group" aria-label="Crosshair controls">
                <button type="button" class="dpad-btn dpad-up" aria-label="Move crosshairs up"></button>
                <button type="button" class="dpad-btn dpad-left" aria-label="Move crosshairs left"></button>
                <span class="dpad-center" aria-hidden="true"></span>
                <button type="button" class="dpad-btn dpad-right" aria-label="Move crosshairs right"></button>
                <button type="button" class="dpad-btn dpad-down" aria-label="Move crosshairs down"></button>
              </div>
              <span class="pad-label">AIM</span>
            </div>

            <div class="delay-cluster">
              <label class="delay-control lcd-text" for="delay">
                ECHO
                <span class="delay-value">${DEFAULT_DELAY_MS}</span>
                MS
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
            </div>

            <div class="ab-cluster">
              <button id="btn-b" type="button" class="btn-circle btn-b" aria-label="B button">B</button>
              <button id="btn-a" type="button" class="btn-circle btn-a" aria-label="Shoot goose">A</button>
            </div>
          </div>

          <div class="start-select-row">
            <button id="select" type="button" class="btn-pill btn-select" aria-pressed="false">
              SELECT
            </button>
            <button id="start" type="button" class="btn-pill btn-start" aria-pressed="false">
              START
            </button>
          </div>
        </div>
      </main>
    `

    this.statusEl = this.root.querySelector('.status')!
    this.delaySliderEl = this.root.querySelector('#delay')!
    this.delayValueEl = this.root.querySelector('.delay-value')!
    this.startButtonEl = this.root.querySelector('#start')!
    this.selectButtonEl = this.root.querySelector('#select')!
    this.btnAEl = this.root.querySelector('#btn-a')!

    const lakePanel = this.root.querySelector('.lake-panel') as HTMLElement
    this.lake = new Lake(lakePanel)
  }

  private bindEvents(): void {
    this.startButtonEl.addEventListener('click', () => {
      this.pendingStart = this.handleStartToggle()
    })

    this.selectButtonEl.addEventListener('click', () => {
      this.handleSelectToggle()
    })

    this.btnAEl.addEventListener('click', () => {
      this.handleShoot()
    })

    this.delaySliderEl.addEventListener('input', () => {
      this.delayMs = Number(this.delaySliderEl.value)
      this.delayValueEl.textContent = String(this.delayMs)
      this.getEngineInstance().setDelayMs(this.delayMs)
    })

    this.bindDpad(this.root.querySelector('.dpad-up')!, 0, -1)
    this.bindDpad(this.root.querySelector('.dpad-down')!, 0, 1)
    this.bindDpad(this.root.querySelector('.dpad-left')!, -1, 0)
    this.bindDpad(this.root.querySelector('.dpad-right')!, 1, 0)

    this.keyHandler = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'enter') {
        event.preventDefault()
        this.startButtonEl.click()
        return
      }

      if (key === 'o') {
        event.preventDefault()
        this.handleShoot()
        return
      }

      if (!this.lake.isCrosshairsActive()) {
        return
      }

      switch (key) {
        case 'w':
          event.preventDefault()
          this.lake.moveCrosshairs(0, -1)
          break
        case 's':
          event.preventDefault()
          this.lake.moveCrosshairs(0, 1)
          break
        case 'a':
          event.preventDefault()
          this.lake.moveCrosshairs(-1, 0)
          break
        case 'd':
          event.preventDefault()
          this.lake.moveCrosshairs(1, 0)
          break
      }
    }

    document.addEventListener('keydown', this.keyHandler)
  }

  private bindDpad(button: HTMLButtonElement, dx: number, dy: number): void {
    button.addEventListener('click', () => {
      this.lake.moveCrosshairs(dx, dy)
    })
  }

  private handleSelectToggle(): void {
    const active = this.lake.toggleCrosshairs()
    this.selectButtonEl.setAttribute('aria-pressed', String(active))
    this.selectButtonEl.classList.toggle('btn-pill-active', active)

    if (active) {
      this.setStatus(
        this.getEngineInstance().isRunning
          ? 'AIM · PRESS A TO SHOOT'
          : 'CROSSHAIRS ON · PRESS START',
      )
      return
    }

    if (this.getEngineInstance().isRunning) {
      this.setStatus('LISTENING · HONK OR PEEP')
      return
    }

    this.setStatus('PRESS START · ALLOW MIC')
  }

  private handleShoot(): void {
    if (!this.lake.isCrosshairsActive()) {
      this.setStatus('PRESS SELECT · AIM FIRST', true)
      return
    }

    const hit = this.lake.shootAtCrosshairs()
    if (hit) {
      this.setStatus('NICE SHOT · SPARKLE POOF')
      return
    }

    this.setStatus('MISSED · MOVE CROSSHAIRS', true)
  }

  private getEngineInstance(): AppEngine {
    this.engine ??= this.getEngine()
    return this.engine
  }

  private async handleStartToggle(): Promise<void> {
    const engine = this.getEngineInstance()

    if (engine.isRunning) {
      engine.stop()
      this.lake.detach()
      this.setStatus(this.lake.isCrosshairsActive() ? 'CROSSHAIRS ON · PRESS START' : 'PRESS START · ALLOW MIC')
      this.updateStartButton(false)
      return
    }

    try {
      await engine.start()
      const analysers = engine.getAnalyserNodes()
      if (analysers) {
        this.lake.attach(analysers.input, analysers.output)
      }
      this.setStatus(
        this.lake.isCrosshairsActive()
          ? 'AIM · PRESS A TO SHOOT'
          : 'LISTENING · HONK OR PEEP',
      )
      this.updateStartButton(true)
    } catch (error) {
      this.lake.detach()
      this.handleStartError(error)
    }
  }

  private handleStartError(error: unknown): void {
    const name = error instanceof Error ? error.name : ''

    if (name === 'NotAllowedError') {
      this.setStatus('MIC DENIED · ALLOW ACCESS', true)
      return
    }

    if (name === 'NotFoundError') {
      this.setStatus('NO MIC FOUND · PLUG IN', true)
      return
    }

    this.setStatus('ERROR · CHECK MIC', true)
  }

  private setStatus(message: string, isError = false): void {
    this.statusEl.textContent = message
    this.statusEl.classList.toggle('status-error', isError)
  }

  private updateStartButton(isRunning: boolean): void {
    this.startButtonEl.textContent = isRunning ? 'STOP' : 'START'
    this.startButtonEl.setAttribute('aria-pressed', String(isRunning))
    this.startButtonEl.classList.toggle('btn-pill-active', isRunning)
  }
}