const MAX_CANVAS_WIDTH = 900
const CANVAS_BG = '#F5F0E6'
const INK_RGBA = 'rgba(44, 44, 44, 0.45)'

const CANVAS_FONT = "'Hepta Slab', Georgia, serif"
const ECHO_R = 107
const ECHO_G = 142
const ECHO_B = 107

type Rgba = [number, number, number, number]

function buildLivePalette(): Rgba[] {
  const palette: Rgba[] = []
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    palette.push([
      Math.round(210 + 35 * t),
      Math.round(120 + 55 * t),
      Math.round(80 + 20 * (1 - t)),
      i === 0 ? 0 : Math.round(90 + 165 * t),
    ])
  }
  return palette
}

export class Spectrogram {
  private readonly container: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly legend: HTMLParagraphElement
  private readonly ctx: CanvasRenderingContext2D
  private inputFrequencyData: Uint8Array
  private outputFrequencyData: Uint8Array
  private animationId: number | null = null
  private inputAnalyser: AnalyserNode | null = null
  private outputAnalyser: AnalyserNode | null = null
  private prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private livePalette = buildLivePalette()
  private canvasWidth = 0
  private canvasHeight = 0

  constructor(container: HTMLElement) {
    this.container = container
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'spectrogram-canvas'
    this.canvas.setAttribute('role', 'img')
    this.canvas.setAttribute(
      'aria-label',
      'Live audio spectrogram with delayed echo overlay',
    )

    this.legend = document.createElement('p')
    this.legend.className = 'spectrogram-legend'
    this.legend.textContent = 'Honk · Echo'

    this.container.appendChild(this.canvas)
    this.container.insertAdjacentElement('afterend', this.legend)

    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create 2D canvas context')
    }
    this.ctx = context
    this.inputFrequencyData = new Uint8Array(0)
    this.outputFrequencyData = new Uint8Array(0)

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', (event) => {
      this.prefersReducedMotion = event.matches
    })

    this.resizeCanvas()
    this.drawIdleState()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        this.resizeCanvas()
        if (!this.inputAnalyser) {
          this.drawIdleState()
        }
      })
      observer.observe(this.container)
    }
  }

  attach(inputAnalyser: AnalyserNode, outputAnalyser: AnalyserNode): void {
    this.inputAnalyser = inputAnalyser
    this.outputAnalyser = outputAnalyser
    this.inputFrequencyData = new Uint8Array(inputAnalyser.frequencyBinCount)
    this.outputFrequencyData = new Uint8Array(outputAnalyser.frequencyBinCount)

    this.resizeCanvas()
    this.clearCanvas()
    this.startLoop()
  }

  detach(): void {
    this.stopLoop()
    this.inputAnalyser = null
    this.outputAnalyser = null
    this.drawIdleState()
  }

  private startLoop(): void {
    this.stopLoop()

    const tick = (): void => {
      this.renderFrame()
      this.animationId = requestAnimationFrame(tick)
    }

    this.animationId = requestAnimationFrame(tick)
  }

  private stopLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private resizeCanvas(): void {
    const rect = this.container.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.min(Math.floor(rect.width * dpr), MAX_CANVAS_WIDTH)
    const height = Math.floor(width / 2.5)

    if (width === this.canvasWidth && height === this.canvasHeight) {
      return
    }

    this.canvasWidth = width
    this.canvasHeight = height
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.width = '100%'
    this.canvas.style.height = 'auto'
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = CANVAS_BG
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
  }

  private drawIdleState(): void {
    this.clearCanvas()
    this.drawGrid(0.08)

    this.ctx.fillStyle = INK_RGBA
    this.ctx.font = `${Math.max(12, Math.floor(this.canvasHeight * 0.12))}px ${CANVAS_FONT}`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('Honks will appear here', this.canvasWidth / 2, this.canvasHeight / 2)
  }

  private drawGrid(opacity: number): void {
    this.ctx.strokeStyle = `rgba(44, 44, 44, ${opacity})`
    this.ctx.lineWidth = 1

    const horizontalLines = 4
    for (let i = 1; i < horizontalLines; i++) {
      const y = (this.canvasHeight / horizontalLines) * i
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvasWidth, y)
      this.ctx.stroke()
    }

    const verticalLines = 6
    for (let i = 1; i < verticalLines; i++) {
      const x = (this.canvasWidth / verticalLines) * i
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvasHeight)
      this.ctx.stroke()
    }
  }

  private renderFrame(): void {
    if (
      !this.inputAnalyser ||
      !this.outputAnalyser ||
      this.canvasWidth === 0 ||
      this.canvasHeight === 0
    ) {
      return
    }

    this.inputAnalyser.getByteFrequencyData(
      this.inputFrequencyData as Uint8Array<ArrayBuffer>,
    )
    this.outputAnalyser.getByteFrequencyData(
      this.outputFrequencyData as Uint8Array<ArrayBuffer>,
    )

    if (this.prefersReducedMotion) {
      this.renderStaticFrame()
      return
    }

    this.scrollCanvas()
    this.drawColumn(this.canvasWidth - 1, this.inputFrequencyData)
    this.drawGhostOverlay(this.canvasWidth - 1, this.outputFrequencyData)
  }

  private renderStaticFrame(): void {
    this.clearCanvas()
    this.drawGrid(0.06)
    this.drawBars(this.inputFrequencyData, 0, this.canvasWidth, false)
    this.drawBars(this.outputFrequencyData, 0, this.canvasWidth, true)
  }

  private scrollCanvas(): void {
    const image = this.ctx.getImageData(1, 0, this.canvasWidth - 1, this.canvasHeight)
    this.ctx.putImageData(image, 0, 0)
    this.ctx.fillStyle = CANVAS_BG
    this.ctx.fillRect(this.canvasWidth - 1, 0, 1, this.canvasHeight)
  }

  private drawColumn(x: number, data: Uint8Array): void {
    if (data.length === 0) {
      return
    }

    const image = this.ctx.createImageData(1, this.canvasHeight)
    const pixels = image.data
    const binCount = data.length

    for (let y = 0; y < this.canvasHeight; y++) {
      const bin = Math.floor(((this.canvasHeight - 1 - y) / this.canvasHeight) * binCount)
      const value = data[bin]
      const pixelIndex = y * 4
      const [r, g, b, a] = this.livePalette[value]

      pixels[pixelIndex] = r
      pixels[pixelIndex + 1] = g
      pixels[pixelIndex + 2] = b
      pixels[pixelIndex + 3] = a
    }

    this.ctx.putImageData(image, x, 0)
  }

  private drawGhostOverlay(x: number, data: Uint8Array): void {
    if (data.length === 0 || this.canvasWidth === 0) {
      return
    }

    const existing = this.ctx.getImageData(x, 0, 1, this.canvasHeight)
    const pixels = existing.data
    const binCount = data.length

    for (let y = 0; y < this.canvasHeight; y++) {
      const bin = Math.floor(((this.canvasHeight - 1 - y) / this.canvasHeight) * binCount)
      const value = data[bin]
      if (value < 8) {
        continue
      }

      const blend = (value / 255) * 0.45
      const pixelIndex = y * 4
      pixels[pixelIndex] = Math.round(pixels[pixelIndex] * (1 - blend) + ECHO_R * blend)
      pixels[pixelIndex + 1] = Math.round(pixels[pixelIndex + 1] * (1 - blend) + ECHO_G * blend)
      pixels[pixelIndex + 2] = Math.round(pixels[pixelIndex + 2] * (1 - blend) + ECHO_B * blend)
      pixels[pixelIndex + 3] = 255
    }

    this.ctx.putImageData(existing, x, 0)
  }

  private drawBars(
    data: Uint8Array,
    offsetX: number,
    width: number,
    isGhost: boolean,
  ): void {
    if (data.length === 0) {
      return
    }

    const barWidth = width / data.length

    for (let i = 0; i < data.length; i++) {
      const value = data[i]
      if (value === 0) {
        continue
      }

      const barHeight = (value / 255) * this.canvasHeight
      const x = offsetX + i * barWidth
      const y = this.canvasHeight - barHeight

      if (isGhost) {
        this.ctx.fillStyle = `rgba(${ECHO_R}, ${ECHO_G}, ${ECHO_B}, ${(value / 255) * 0.45})`
      } else {
        const [r, g, b, a] = this.livePalette[value]
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`
      }

      this.ctx.fillRect(x, y, Math.max(1, barWidth), barHeight)
    }
  }
}