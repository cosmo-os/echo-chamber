const HATCH_DELAY_MS = 1200
const FLIGHT_DURATION_MS = 1600
const SOUND_COOLDOWN_MS = 280
const SOUND_PEAK_WINDOW_MS = 100
const SOUND_FLOOR = 0.045
const QUIET_THRESHOLD = 0.1
const MAX_GEESE = 48
const SPARKLE_DURATION_MS = 600
const CROSSHAIR_STEP = 0.05
const LAKE_TOP_RATIO = 0.473
const DOG_RUN_MS = 1100
const DOG_JUMP_MS = 550
const DOG_SPLASH_MS = 450
const BARK_SCORE_THRESHOLD = 0.34
const BARK_ZCR_THRESHOLD = 0.035

/** Classify peak mic RMS: quiet peeps hatch eggs, loud honks fly in. */
export function classifySoundVolume(peakRms: number): 'egg' | 'goose' {
  return peakRms < QUIET_THRESHOLD ? 'egg' : 'goose'
}

/** Zero-crossing rate of byte time-domain data (0–1). Barks tend to be higher than honks. */
export function computeZeroCrossingRate(data: Uint8Array): number {
  if (data.length < 2) {
    return 0
  }

  let crossings = 0
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1] - 128
    const curr = data[i] - 128
    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      crossings++
    }
  }

  return crossings / data.length
}

/** Mid-band spectral energy ratio — dog barks concentrate around 400–2600 Hz. */
export function computeBarkScore(frequencyData: Uint8Array, sampleRate: number): number {
  if (frequencyData.length === 0 || sampleRate <= 0) {
    return 0
  }

  const binHz = sampleRate / (frequencyData.length * 2)
  let barkEnergy = 0
  let lowEnergy = 0
  let total = 0

  for (let i = 0; i < frequencyData.length; i++) {
    const hz = i * binHz
    const energy = frequencyData[i] / 255
    total += energy

    if (hz >= 400 && hz <= 2600) {
      barkEnergy += energy * 1.35
    } else if (hz < 400) {
      lowEnergy += energy
    }
  }

  if (total < 0.04) {
    return 0
  }

  const ratio = barkEnergy / total
  const contrast = barkEnergy / (lowEnergy + 0.01)
  return ratio * Math.min(contrast, 2.8) / 2.8
}

/** Classify a completed sound event using volume, spectrum, and transient shape. */
export function classifySoundEvent(
  peakRms: number,
  barkScore: number,
  zcr: number,
): 'egg' | 'goose' | 'bark' {
  if (peakRms < QUIET_THRESHOLD) {
    return 'egg'
  }

  if (barkScore >= 0.52) {
    return 'bark'
  }

  if (barkScore >= BARK_SCORE_THRESHOLD && zcr >= BARK_ZCR_THRESHOLD) {
    return 'bark'
  }

  return 'goose'
}

/** Compute normalized RMS from byte time-domain analyser data (0–1). */
export function computeWaveformRms(data: Uint8Array): number {
  if (data.length === 0) {
    return 0
  }

  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const sample = (data[i] - 128) / 128
    sum += sample * sample
  }

  return Math.sqrt(sum / data.length)
}

/** Pokémon R/B-inspired pastels — multi-shade, outlined sprites */
const P = {
  skyA: '#98c8f0',
  skyB: '#b8d8f8',
  skyC: '#d0e8ff',
  cloudHi: '#f8fcff',
  cloudLo: '#c0d8f0',
  hillA: '#88c090',
  hillB: '#68a878',
  hillC: '#509060',
  treeHi: '#78d080',
  treeMid: '#58b068',
  treeLo: '#388848',
  trunk: '#907050',
  grassHi: '#98e098',
  grassMid: '#70c070',
  grassLo: '#50a058',
  sand: '#e0d0a8',
  sandLo: '#c8b890',
  waterHi: '#90d0f8',
  waterMid: '#68a8e0',
  waterLo: '#4888c8',
  waterDeep: '#3068a8',
  sparkle: '#d8f0ff',
  reed: '#58a868',
  eggHi: '#fffaf0',
  eggMid: '#f0e4c8',
  eggLo: '#d8c8a8',
  gooseHi: '#fafaf4',
  gooseMid: '#e8e8dc',
  gooseLo: '#c8c8b8',
  wing: '#b0b8a8',
  beak: '#f0a858',
  beakLo: '#d88838',
  eye: '#404040',
  outline: '#505858',
  prompt: '#486878',
  blanketA: '#f0a0b8',
  blanketB: '#fff4f8',
  skin: '#f8d0b0',
  skinLo: '#d8a888',
  hairMom: '#684838',
  hairDad: '#403020',
  hairBoy: '#885838',
  dress: '#d888b0',
  dressLo: '#b86898',
  shirt: '#6898d0',
  shirtLo: '#4878b0',
  boyShirt: '#f0c858',
  boyShorts: '#5090c8',
  picnicBasket: '#c89868',
  dogHi: '#e8c8a0',
  dogMid: '#c8a070',
  dogLo: '#987048',
  dogEar: '#a87850',
  dogNose: '#403030',
} as const

type FlyingGoose = {
  startTime: number
  originX: number
  originY: number
  arcX: number
  arcY: number
}

type SparkleBurst = {
  x: number
  y: number
  startTime: number
  size: number
}

type DogSplash = {
  startTime: number
  fromLeft: boolean
  originX: number
  grassY: number
  launchX: number
  splashX: number
  splashY: number
  size: number
}

type LakeEntity =
  | {
      kind: 'egg'
      x: number
      y: number
      size: number
      spawnTime: number
      bobPhase: number
    }
  | {
      kind: 'goose'
      id: number
      x: number
      y: number
      size: number
      bobPhase: number
      facing: 1 | -1
      landedTime: number
      swimTargetX: number
      swimTargetY: number
      wanderUntil: number
      flying?: FlyingGoose
    }

export class Lake {
  private readonly container: HTMLElement
  private readonly canvas: HTMLCanvasElement
  private readonly legend: HTMLParagraphElement
  private readonly ctx: CanvasRenderingContext2D
  private timeDomainData: Uint8Array
  private frequencyDomainData: Uint8Array
  private sampleRate = 48000
  private animationId: number | null = null
  private inputAnalyser: AnalyserNode | null = null
  private prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private canvasWidth = 0
  private canvasHeight = 0
  private entities: LakeEntity[] = []
  private lastSoundTime = 0
  private soundEventActive = false
  private soundEventStart = 0
  private soundEventPeak = 0
  private frameTime = 0
  private lastUpdateTime = 0
  private waterBounds = { x: 0, y: 0, w: 0, h: 0 }
  private lakeBounds = { x: 0, y: 0, w: 0, h: 0 }
  private nextEntityId = 1
  private crosshairsActive = false
  private crosshairNormX = 0.5
  private crosshairNormY = 0.5
  private sparkleBursts: SparkleBurst[] = []
  private dogs: DogSplash[] = []
  private soundEventPeakBarkScore = 0
  private soundEventPeakZcr = 0

  constructor(container: HTMLElement) {
    this.container = container
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'lake-canvas'
    this.canvas.setAttribute('role', 'img')
    this.canvas.setAttribute(
      'aria-label',
      'Pokémon-style lake scene — honks, peeps, and barks summon geese, eggs, and swimming dogs',
    )

    this.legend = document.createElement('p')
    this.legend.className = 'lake-legend screen-text'
    this.legend.textContent = 'SELECT = aim  ·  A = shoot  ·  HONK / PEEP / WOOF'

    this.container.appendChild(this.canvas)
    this.container.insertAdjacentElement('afterend', this.legend)

    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Could not create 2D canvas context')
    }
    this.ctx = context
    this.timeDomainData = new Uint8Array(0)
    this.frequencyDomainData = new Uint8Array(0)

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', (event) => {
      this.prefersReducedMotion = event.matches
    })

    this.resizeCanvas()
    this.drawIdleScene()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        this.resizeCanvas()
        if (!this.inputAnalyser) {
          this.drawIdleScene()
        }
      })
      observer.observe(this.container)
    }
  }

  attach(inputAnalyser: AnalyserNode, _outputAnalyser: AnalyserNode): void {
    this.inputAnalyser = inputAnalyser
    this.timeDomainData = new Uint8Array(inputAnalyser.fftSize)
    this.frequencyDomainData = new Uint8Array(inputAnalyser.frequencyBinCount)
    this.sampleRate = inputAnalyser.context?.sampleRate ?? 48000
    this.entities = []
    this.dogs = []
    this.lastSoundTime = 0
    this.soundEventActive = false
    this.soundEventPeak = 0
    this.soundEventPeakBarkScore = 0
    this.soundEventPeakZcr = 0
    this.frameTime = performance.now()
    this.lastUpdateTime = this.frameTime

    this.resizeCanvas()
    this.startLoop()
  }

  detach(): void {
    this.stopLoop()
    this.inputAnalyser = null
    this.entities = []
    this.dogs = []
    this.sparkleBursts = []
    this.drawIdleScene()
  }

  isCrosshairsActive(): boolean {
    return this.crosshairsActive
  }

  setCrosshairsActive(active: boolean): void {
    this.crosshairsActive = active
    if (active) {
      this.clampCrosshairNorms()
    }
    this.redraw()
  }

  toggleCrosshairs(): boolean {
    this.crosshairsActive = !this.crosshairsActive
    if (this.crosshairsActive) {
      this.clampCrosshairNorms()
    }
    this.redraw()
    return this.crosshairsActive
  }

  moveCrosshairs(dx: number, dy: number): void {
    if (!this.crosshairsActive) {
      return
    }

    this.crosshairNormX += dx * CROSSHAIR_STEP
    this.crosshairNormY += dy * CROSSHAIR_STEP
    this.clampCrosshairNorms()
    this.redraw()
  }

  getCrosshairCanvasPosition(): { x: number; y: number } {
    return this.getCrosshairPosition()
  }

  shootAtCrosshairs(): boolean {
    if (!this.crosshairsActive) {
      return false
    }

    const aim = this.getCrosshairPosition()
    let hitIndex = -1
    let bestDist = Infinity

    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i]
      if (entity.kind !== 'goose' || entity.flying) {
        continue
      }

      const dist = Math.hypot(entity.x - aim.x, entity.y - aim.y)
      const hitRadius = entity.size * 0.65
      if (dist <= hitRadius && dist < bestDist) {
        bestDist = dist
        hitIndex = i
      }
    }

    if (hitIndex < 0) {
      return false
    }

    const hit = this.entities[hitIndex] as Extract<LakeEntity, { kind: 'goose' }>
    this.entities.splice(hitIndex, 1)
    this.sparkleBursts.push({
      x: hit.x,
      y: hit.y,
      startTime: performance.now(),
      size: hit.size,
    })
    this.redraw()
    return true
  }

  private getCrosshairArm(): number {
    return Math.max(8, this.canvasHeight * 0.028)
  }

  private getCrosshairPosition(): { x: number; y: number } {
    return {
      x: this.lakeBounds.x + this.crosshairNormX * this.lakeBounds.w,
      y: this.lakeBounds.y + this.crosshairNormY * this.lakeBounds.h,
    }
  }

  private clampCrosshairNorms(): void {
    if (this.lakeBounds.w <= 0 || this.lakeBounds.h <= 0) {
      return
    }

    const arm = this.getCrosshairArm()
    const marginX = Math.min(0.45, arm / this.lakeBounds.w)
    const marginY = Math.min(0.45, arm / this.lakeBounds.h)

    this.crosshairNormX = Math.min(1 - marginX, Math.max(marginX, this.crosshairNormX))
    this.crosshairNormY = Math.min(1 - marginY, Math.max(marginY, this.crosshairNormY))
  }

  private redraw(): void {
    if (this.inputAnalyser) {
      return
    }

    this.drawIdleScene()
  }

  private nextId(): number {
    return this.nextEntityId++
  }

  private startLoop(): void {
    this.stopLoop()

    const tick = (now: number): void => {
      this.renderFrame(now)
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
    const width = Math.floor(rect.width * dpr)
    const height = Math.floor(rect.height * dpr)

    if (width === this.canvasWidth && height === this.canvasHeight) {
      return
    }

    this.canvasWidth = width
    this.canvasHeight = height
    this.canvas.width = width
    this.canvas.height = height
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'

    this.waterBounds = {
      x: Math.floor(width * 0.06),
      y: Math.floor(height * 0.42),
      w: Math.floor(width * 0.88),
      h: Math.floor(height * 0.5),
    }

    const lakeTop = Math.floor(height * LAKE_TOP_RATIO)
    this.lakeBounds = {
      x: Math.floor(width * 0.06),
      y: lakeTop,
      w: Math.floor(width * 0.88),
      h: Math.max(1, height - lakeTop - Math.floor(height * 0.02)),
    }

    this.clampCrosshairNorms()
  }

  private drawIdleScene(): void {
    this.drawScene(this.frameTime)
    this.drawIdlePrompt()
    this.drawSparkleBursts(this.frameTime)
    if (this.crosshairsActive) {
      this.drawCrosshairs()
    }
  }

  private updateSparkles(now: number): void {
    this.sparkleBursts = this.sparkleBursts.filter(
      (burst) => now - burst.startTime < SPARKLE_DURATION_MS,
    )
  }

  private drawCrosshairs(): void {
    const { x, y } = this.getCrosshairPosition()
    const ctx = this.ctx
    const arm = Math.max(8, this.canvasHeight * 0.028)
    const gap = arm * 0.35

    ctx.save()
    ctx.strokeStyle = 'rgba(255, 90, 110, 0.92)'
    ctx.lineWidth = Math.max(1.5, this.canvasHeight * 0.004)
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(x - arm, y)
    ctx.lineTo(x - gap, y)
    ctx.moveTo(x + gap, y)
    ctx.lineTo(x + arm, y)
    ctx.moveTo(x, y - arm)
    ctx.lineTo(x, y - gap)
    ctx.moveTo(x, y + gap)
    ctx.lineTo(x, y + arm)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(x, y, Math.max(2, arm * 0.14), 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawSparkleBursts(now: number): void {
    const ctx = this.ctx

    for (const burst of this.sparkleBursts) {
      const age = now - burst.startTime
      const t = Math.min(1, age / SPARKLE_DURATION_MS)
      const fade = 1 - t
      const spread = burst.size * (0.45 + t * 1.1)
      const particleCount = 20

      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + t * 0.8
        const px = burst.x + Math.cos(angle) * spread
        const py = burst.y + Math.sin(angle) * spread * 0.7
        const radius = burst.size * 0.12 * fade + 2.5

        ctx.fillStyle = `rgba(255, 248, 210, ${fade * 0.95})`
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fill()

        if (i % 2 === 0) {
          const star = radius * 1.8
          ctx.fillStyle = `rgba(200, 230, 255, ${fade * 0.85})`
          ctx.fillRect(px - 1.5, py - star, 3, star * 2)
          ctx.fillRect(px - star, py - 1.5, star * 2, 3)
        }
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.65})`
      ctx.beginPath()
      ctx.arc(burst.x, burst.y, burst.size * 0.38 * (1 + t * 0.55), 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(255, 220, 160, ${fade * 0.4})`
      ctx.beginPath()
      ctx.arc(burst.x, burst.y, burst.size * 0.55 * (1 + t * 0.35), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawIdlePrompt(): void {
    const cx = this.canvasWidth / 2
    const cy = this.waterBounds.y + this.waterBounds.h * 0.45

    this.ctx.fillStyle = P.prompt
    this.ctx.font = `600 ${Math.max(9, Math.floor(this.canvasHeight * 0.038))}px "VT323", monospace`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('Press START to listen', cx, cy)
  }

  private renderFrame(now: number): void {
    if (!this.inputAnalyser || this.canvasWidth === 0 || this.canvasHeight === 0) {
      return
    }

    this.frameTime = now
    const dt = this.lastUpdateTime ? Math.min(48, now - this.lastUpdateTime) : 16
    this.lastUpdateTime = now
    this.detectSound(now)
    this.updateEntities(now, dt)
    this.updateDogs(now)
    this.updateSparkles(now)
    this.drawScene(now)
    this.drawEntities(now)
    this.drawDogs(now)
    this.drawSparkleBursts(now)
    if (this.crosshairsActive) {
      this.drawCrosshairs()
    }
  }

  private detectSound(now: number): void {
    const analyser = this.inputAnalyser
    if (!analyser) {
      return
    }

    analyser.getByteTimeDomainData(
      this.timeDomainData as Uint8Array<ArrayBuffer>,
    )
    analyser.getByteFrequencyData(
      this.frequencyDomainData as Uint8Array<ArrayBuffer>,
    )

    const rms = computeWaveformRms(this.timeDomainData)
    const zcr = computeZeroCrossingRate(this.timeDomainData)
    const barkScore = computeBarkScore(this.frequencyDomainData, this.sampleRate)
    const isAboveFloor = rms >= SOUND_FLOOR

    if (isAboveFloor) {
      if (!this.soundEventActive) {
        this.soundEventActive = true
        this.soundEventStart = now
        this.soundEventPeak = rms
        this.soundEventPeakBarkScore = barkScore
        this.soundEventPeakZcr = zcr
      } else {
        if (rms >= this.soundEventPeak) {
          this.soundEventPeak = rms
          this.soundEventPeakBarkScore = barkScore
          this.soundEventPeakZcr = zcr
        } else {
          this.soundEventPeakBarkScore = Math.max(this.soundEventPeakBarkScore, barkScore)
          this.soundEventPeakZcr = Math.max(this.soundEventPeakZcr, zcr)
        }

        if (now - this.soundEventStart >= SOUND_PEAK_WINDOW_MS) {
          this.completeSoundEvent(now)
        }
      }
    } else if (this.soundEventActive) {
      this.completeSoundEvent(now)
    }
  }

  private completeSoundEvent(now: number): void {
    if (!this.soundEventActive) {
      return
    }

    this.soundEventActive = false

    if (this.soundEventPeak < SOUND_FLOOR) {
      return
    }

    if (now - this.lastSoundTime < SOUND_COOLDOWN_MS) {
      return
    }

    this.lastSoundTime = now
    this.spawnFromSound(
      this.soundEventPeak,
      this.soundEventPeakBarkScore,
      this.soundEventPeakZcr,
      now,
    )
  }

  private spawnFromSound(
    volume: number,
    barkScore: number,
    zcr: number,
    now: number,
  ): void {
    const kind = classifySoundEvent(volume, barkScore, zcr)

    if (kind === 'bark') {
      this.spawnDog(now)
      return
    }

    if (this.entities.length >= MAX_GEESE) {
      this.entities.shift()
    }

    const size = this.volumeToGooseSize(volume)
    const position = this.randomWaterPosition()

    if (kind === 'egg') {
      this.entities.push({
        kind: 'egg',
        x: position.x,
        y: position.y,
        size,
        spawnTime: now,
        bobPhase: Math.random() * Math.PI * 2,
      })
      return
    }

    const approachFromLeft = position.x > this.canvasWidth * 0.5
    const originX = approachFromLeft ? -size * 2 : this.canvasWidth + size * 2
    const originY = this.canvasHeight * 0.05
    const arcX = position.x + (approachFromLeft ? size * 3 : -size * 3)
    const arcY = position.y - size * 3.5
    const swim = this.randomSwimTarget(position.x, now)

    this.entities.push({
      kind: 'goose',
      id: this.nextId(),
      x: position.x,
      y: position.y,
      size,
      bobPhase: Math.random() * Math.PI * 2,
      landedTime: now,
      ...swim,
      flying: { startTime: now, originX, originY, arcX, arcY },
    })
  }

  private volumeToGooseSize(volume: number): number {
    const normalized = Math.min(1, Math.max(0, (volume - SOUND_FLOOR) / (0.32 - SOUND_FLOOR)))
    const minSize = Math.max(12, Math.floor(this.canvasHeight * 0.07))
    const maxSize = Math.max(24, Math.floor(this.canvasHeight * 0.15))
    return Math.round(minSize + normalized * (maxSize - minSize))
  }

  private spawnDog(now: number): void {
    const splash = this.randomWaterPosition()
    const fromLeft = Math.random() > 0.5
    const grassY = this.canvasHeight * 0.405
    const size = Math.max(26, Math.floor(this.canvasHeight * 0.11))
    const launchX = fromLeft
      ? this.lakeBounds.x + this.lakeBounds.w * (0.18 + Math.random() * 0.22)
      : this.lakeBounds.x + this.lakeBounds.w * (0.6 + Math.random() * 0.22)

    this.dogs.push({
      startTime: now,
      fromLeft,
      originX: fromLeft ? -size * 2.2 : this.canvasWidth + size * 2.2,
      grassY,
      launchX,
      splashX: splash.x,
      splashY: splash.y,
      size,
    })
  }

  private updateDogs(now: number): void {
    const totalMs = DOG_RUN_MS + DOG_JUMP_MS + DOG_SPLASH_MS
    this.dogs = this.dogs.filter((dog) => now - dog.startTime < totalMs)
  }

  private drawDogs(now: number): void {
    for (const dog of this.dogs) {
      this.drawDog(dog, now)
    }
  }

  private drawDog(dog: DogSplash, now: number): void {
    const age = now - dog.startTime
    const totalMs = DOG_RUN_MS + DOG_JUMP_MS + DOG_SPLASH_MS

    if (age >= totalMs) {
      return
    }

    const facing: 1 | -1 = dog.fromLeft ? 1 : -1
    let x = dog.originX
    let y = dog.grassY
    let pose: 'run' | 'jump' | 'splash' = 'run'
    let legFrame = Math.floor(now / 80) % 2

    if (this.prefersReducedMotion) {
      if (age < DOG_SPLASH_MS) {
        x = dog.launchX
        y = dog.grassY
        pose = 'run'
      } else {
        x = dog.splashX
        y = dog.splashY
        pose = 'splash'
        this.drawSplash(x, y, dog.size * 1.2)
      }
      this.drawDogSprite(x, y, dog.size, facing, pose, legFrame)
      return
    }

    if (age < DOG_RUN_MS) {
      const t = this.easeInOutSine(age / DOG_RUN_MS)
      x = dog.originX + (dog.launchX - dog.originX) * t
      y = dog.grassY
      pose = 'run'
    } else if (age < DOG_RUN_MS + DOG_JUMP_MS) {
      const jumpAge = age - DOG_RUN_MS
      const t = this.easeInOutSine(jumpAge / DOG_JUMP_MS)
      const arcX = (dog.launchX + dog.splashX) / 2
      const arcY = Math.min(dog.grassY, dog.splashY) - dog.size * 2.8
      const u = 1 - t
      x = u * u * dog.launchX + 2 * u * t * arcX + t * t * dog.splashX
      y = u * u * dog.grassY + 2 * u * t * arcY + t * t * dog.splashY
      pose = 'jump'
      legFrame = 1
    } else {
      const splashAge = age - DOG_RUN_MS - DOG_JUMP_MS
      const t = Math.min(1, splashAge / DOG_SPLASH_MS)
      x = dog.splashX
      y = dog.splashY + t * dog.size * 0.25
      pose = 'splash'
      this.drawSplash(x, y, dog.size * (0.8 + t * 0.5))
    }

    this.drawDogSprite(x, y, dog.size, facing, pose, legFrame)
  }

  private drawDogSprite(
    x: number,
    y: number,
    size: number,
    facing: 1 | -1,
    pose: 'run' | 'jump' | 'splash',
    legFrame: number,
  ): void {
    const ctx = this.ctx
    const s = size / 28
    const alpha = pose === 'splash' ? 0.55 : 1

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    ctx.scale(facing, 1)

    if (pose === 'run') {
      this.drawDogLeg(ctx, s, -s * 5, s * 2.5, legFrame === 0 ? -s * 2 : s * 1.5)
      this.drawDogLeg(ctx, s, -s * 1.5, s * 2.5, legFrame === 0 ? s * 1.5 : -s * 2)
      this.drawDogLeg(ctx, s, s * 2, s * 2.5, legFrame === 0 ? s * 1.5 : -s * 2)
      this.drawDogLeg(ctx, s, s * 5.5, s * 2.5, legFrame === 0 ? -s * 2 : s * 1.5)
    } else if (pose === 'jump') {
      ctx.strokeStyle = P.dogLo
      ctx.lineWidth = s * 1.8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-s * 4, s * 1)
      ctx.lineTo(-s * 6, -s * 2)
      ctx.moveTo(s * 2, s * 0.5)
      ctx.lineTo(s * 4, -s * 3)
      ctx.moveTo(s * 5, s * 1)
      ctx.lineTo(s * 7, -s * 1)
      ctx.stroke()
    }

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, -s * 1, s * 11, s * 5.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.dogLo
    ctx.beginPath()
    ctx.ellipse(0, -s * 1.5, s * 10.5, s * 5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.dogMid
    ctx.beginPath()
    ctx.ellipse(-s * 1, -s * 2, s * 8, s * 4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.dogHi
    ctx.beginPath()
    ctx.ellipse(-s * 3, -s * 3, s * 4.5, s * 2.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(s * 9, -s * 3.5, s * 4.5, s * 4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.dogHi
    ctx.beginPath()
    ctx.ellipse(s * 9, -s * 4, s * 4, s * 3.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.dogEar
    ctx.beginPath()
    ctx.ellipse(s * 7.5, -s * 6.5, s * 2.2, s * 3.2, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(s * 10.5, -s * 6, s * 2, s * 2.8, 0.25, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.eye
    ctx.beginPath()
    ctx.arc(s * 10, -s * 4.2, s * 0.75, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.dogNose
    ctx.beginPath()
    ctx.ellipse(s * 12.2, -s * 3.2, s * 1.2, s * 0.9, 0, 0, Math.PI * 2)
    ctx.fill()

    if (pose === 'splash') {
      ctx.fillStyle = P.dogMid
      ctx.beginPath()
      ctx.ellipse(0, s * 2, s * 8, s * 3, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  private drawDogLeg(
    ctx: CanvasRenderingContext2D,
    s: number,
    x: number,
    baseY: number,
    offset: number,
  ): void {
    ctx.strokeStyle = P.outline
    ctx.lineWidth = s * 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.lineTo(x + offset * 0.3, baseY + s * 3.5)
    ctx.stroke()

    ctx.strokeStyle = P.dogLo
    ctx.lineWidth = s * 1.5
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.lineTo(x + offset * 0.3, baseY + s * 3.2)
    ctx.stroke()
  }

  private randomWaterPosition(): { x: number; y: number } {
    const pad = 0.12
    return {
      x:
        this.waterBounds.x +
        pad * this.waterBounds.w +
        Math.random() * this.waterBounds.w * (1 - pad * 2),
      y:
        this.waterBounds.y +
        pad * this.waterBounds.h +
        Math.random() * this.waterBounds.h * (1 - pad * 2),
    }
  }

  private randomSwimTarget(fromX: number, now: number): {
    swimTargetX: number
    swimTargetY: number
    wanderUntil: number
    facing: 1 | -1
  } {
    const target = this.randomWaterPosition()
    return {
      swimTargetX: target.x,
      swimTargetY: target.y,
      wanderUntil: now + 2500 + Math.random() * 3500,
      facing: target.x >= fromX ? 1 : -1,
    }
  }

  private clampToWater(x: number, y: number, margin: number): { x: number; y: number } {
    const pad = 0.1
    const minX = this.waterBounds.x + pad * this.waterBounds.w + margin
    const maxX = this.waterBounds.x + this.waterBounds.w * (1 - pad) - margin
    const minY = this.waterBounds.y + pad * this.waterBounds.h + margin
    const maxY = this.waterBounds.y + this.waterBounds.h * (1 - pad) - margin

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    }
  }

  private updateSwimmingGoose(
    entity: Extract<LakeEntity, { kind: 'goose' }>,
    now: number,
    dt: number,
  ): Extract<LakeEntity, { kind: 'goose' }> {
    if (this.prefersReducedMotion) {
      return entity
    }

    let { x, y, swimTargetX, swimTargetY, wanderUntil, facing } = entity
    const dx = swimTargetX - x
    const dy = swimTargetY - y
    const dist = Math.hypot(dx, dy)

    if (dist < entity.size * 0.4 || now >= wanderUntil) {
      const next = this.randomSwimTarget(x, now)
      return { ...entity, ...next }
    }

    const speed = entity.size * 0.028 * (dt / 16)
    const step = Math.min(dist, speed)
    x += (dx / dist) * step
    y += (dy / dist) * step
    facing = dx >= 0 ? 1 : -1

    const clamped = this.clampToWater(x, y, entity.size * 0.3)
    return { ...entity, x: clamped.x, y: clamped.y, facing }
  }

  private updateEntities(now: number, dt: number): void {
    const next: LakeEntity[] = []

    for (const entity of this.entities) {
      if (entity.kind === 'egg') {
        const elapsed = now - entity.spawnTime
        if (elapsed >= HATCH_DELAY_MS) {
          const swim = this.randomSwimTarget(entity.x, now)
          next.push({
            kind: 'goose',
            id: this.nextId(),
            x: entity.x,
            y: entity.y,
            size: entity.size,
            bobPhase: entity.bobPhase,
            landedTime: now,
            ...swim,
          })
        } else {
          next.push(entity)
        }
        continue
      }

      if (entity.flying) {
        const flightAge = now - entity.flying.startTime
        if (this.prefersReducedMotion || flightAge >= FLIGHT_DURATION_MS) {
          const swim = this.randomSwimTarget(entity.x, now)
          next.push({
            ...entity,
            flying: undefined,
            landedTime: now,
            ...swim,
          })
        } else {
          next.push(entity)
        }
        continue
      }

      next.push(this.updateSwimmingGoose(entity, now, dt))
    }

    this.entities = next
  }

  private drawScene(now: number): void {
    const w = this.canvasWidth
    const h = this.canvasHeight
    if (w === 0 || h === 0) {
      return
    }

    const ctx = this.ctx
    const t = this.prefersReducedMotion ? 0 : now * 0.001

    this.drawSky(ctx, w, h)
    this.drawClouds(ctx, w, h, t)
    this.drawHills(ctx, w, h)
    this.drawTrees(ctx, w, h)
    this.drawPicnicFamily(ctx, w, h, t)
    this.drawShore(ctx, w, h)
    this.drawWater(ctx, w, h, t)
    this.drawReeds(ctx, w, h, t)
  }

  private drawSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const horizon = h * 0.44
    const bands = [
      { y: 0, color: P.skyA },
      { y: horizon * 0.4, color: P.skyB },
      { y: horizon * 0.75, color: P.skyC },
    ]

    for (let i = 0; i < bands.length; i++) {
      const y0 = bands[i].y
      const y1 = i < bands.length - 1 ? bands[i + 1].y : horizon
      ctx.fillStyle = bands[i].color
      ctx.fillRect(0, y0, w, y1 - y0)
    }
  }

  private drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const clouds = [
      { x: w * 0.1, y: h * 0.07, s: w * 0.1 },
      { x: w * 0.42, y: h * 0.04, s: w * 0.13 },
      { x: w * 0.72, y: h * 0.08, s: w * 0.09 },
    ]

    for (const [i, cloud] of clouds.entries()) {
      const drift = this.prefersReducedMotion ? 0 : Math.sin(t * 0.25 + i) * w * 0.006
      this.drawRouteCloud(ctx, cloud.x + drift, cloud.y, cloud.s)
    }
  }

  private drawRouteCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    const puffs = [
      { dx: 0, dy: 0, r: size * 0.35 },
      { dx: -size * 0.3, dy: size * 0.05, r: size * 0.25 },
      { dx: size * 0.28, dy: size * 0.03, r: size * 0.27 },
      { dx: size * 0.1, dy: -size * 0.08, r: size * 0.2 },
    ]

    ctx.fillStyle = P.cloudLo
    for (const puff of puffs) {
      ctx.beginPath()
      ctx.arc(x + puff.dx + 2, y + puff.dy + 2, puff.r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = P.cloudHi
    for (const puff of puffs) {
      ctx.beginPath()
      ctx.arc(x + puff.dx, y + puff.dy, puff.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawHills(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const layers = [
      { color: P.hillA, base: 0.36, amp: 0.045 },
      { color: P.hillB, base: 0.39, amp: 0.035 },
      { color: P.hillC, base: 0.41, amp: 0.028 },
    ]

    for (const layer of layers) {
      ctx.fillStyle = layer.color
      ctx.beginPath()
      ctx.moveTo(0, h * (layer.base + 0.04))
      for (let x = 0; x <= w; x += w / 20) {
        const y =
          h * layer.base +
          Math.sin(x * 0.01) * h * layer.amp +
          Math.sin(x * 0.025 + 1) * h * layer.amp * 0.5
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h * 0.46)
      ctx.lineTo(0, h * 0.46)
      ctx.closePath()
      ctx.fill()
    }
  }

  private drawTrees(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.drawRouteTree(ctx, w * 0.08, h * 0.38, h * 0.11)
    this.drawRouteTree(ctx, w * 0.22, h * 0.385, h * 0.09)
    this.drawRouteTree(ctx, w * 0.76, h * 0.375, h * 0.12)
    this.drawRouteTree(ctx, w * 0.9, h * 0.38, h * 0.085)
    this.drawShrub(ctx, w * 0.35, h * 0.4, h * 0.045)
    this.drawShrub(ctx, w * 0.58, h * 0.395, h * 0.04)
  }

  private drawRouteTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    baseY: number,
    height: number,
  ): void {
    const trunkW = height * 0.1
    const trunkH = height * 0.32

    ctx.fillStyle = P.outline
    ctx.fillRect(x - trunkW / 2 - 1, baseY - 1, trunkW + 2, trunkH + 2)
    ctx.fillStyle = P.trunk
    ctx.fillRect(x - trunkW / 2, baseY, trunkW, trunkH)

    const crownR = height * 0.34
    const crownY = baseY - height * 0.1

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.arc(x, crownY, crownR + 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.treeLo
    ctx.beginPath()
    ctx.arc(x, crownY, crownR, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.treeMid
    ctx.beginPath()
    ctx.arc(x - crownR * 0.2, crownY - crownR * 0.15, crownR * 0.65, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.treeHi
    ctx.beginPath()
    ctx.arc(x - crownR * 0.35, crownY - crownR * 0.3, crownR * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawShrub(
    ctx: CanvasRenderingContext2D,
    x: number,
    baseY: number,
    height: number,
  ): void {
    ctx.fillStyle = P.treeLo
    ctx.beginPath()
    ctx.ellipse(x, baseY - height * 0.25, height * 0.8, height * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.treeHi
    ctx.beginPath()
    ctx.ellipse(x - height * 0.2, baseY - height * 0.35, height * 0.4, height * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawPicnicFamily(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
  ): void {
    const blanketW = w * 0.34
    const blanketH = h * 0.055
    const blanketX = w * 0.44
    const blanketY = h * 0.385
    const lean = this.prefersReducedMotion ? 0 : Math.sin(t * 0.8) * 0.04

    ctx.save()
    ctx.translate(blanketX, blanketY)
    ctx.rotate(lean)

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, 2, blanketW / 2 + 2, blanketH / 2 + 2, 0, 0, Math.PI * 2)
    ctx.fill()

    const cols = 6
    const rows = 3
    const cellW = blanketW / cols
    const cellH = blanketH / rows
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? P.blanketA : P.blanketB
        ctx.fillRect(
          -blanketW / 2 + col * cellW,
          -blanketH / 2 + row * cellH,
          cellW,
          cellH,
        )
      }
    }

    this.drawPicnicBasket(ctx, blanketW * 0.38, -blanketH * 0.55, h * 0.045)
    this.drawSeatedDad(ctx, -blanketW * 0.22, 0, h * 0.09)
    this.drawSeatedBoy(ctx, 0, blanketH * 0.05, h * 0.065)
    this.drawSeatedMom(ctx, blanketW * 0.22, 0, h * 0.085)

    ctx.restore()
  }

  private drawPicnicBasket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    ctx.fillStyle = P.outline
    ctx.fillRect(x - size * 0.45, y - size * 0.15, size * 0.9 + 2, size * 0.55 + 2)
    ctx.fillStyle = P.picnicBasket
    ctx.fillRect(x - size * 0.45, y - size * 0.15, size * 0.9, size * 0.55)
    ctx.strokeStyle = P.outline
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y - size * 0.2, size * 0.35, Math.PI, 0)
    ctx.stroke()
  }

  private drawSeatedDad(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    const s = size / 20
    ctx.save()
    ctx.translate(x, y)

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, s * 5, s * 5.5, s * 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.shirtLo
    ctx.beginPath()
    ctx.ellipse(0, s * 5, s * 5, s * 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.shirt
    ctx.beginPath()
    ctx.ellipse(0, s * 4.5, s * 4.5, s * 3.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.arc(s * 1, -s * 5, s * 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.skinLo
    ctx.beginPath()
    ctx.arc(0, -s * 5, s * 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.skin
    ctx.beginPath()
    ctx.arc(0, -s * 5.5, s * 3.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.hairDad
    ctx.beginPath()
    ctx.arc(0, -s * 7, s * 3.8, Math.PI, 0)
    ctx.fill()

    ctx.fillStyle = P.eye
    ctx.beginPath()
    ctx.arc(s * 1.2, -s * 5.5, s * 0.7, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawSeatedMom(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    const s = size / 20
    ctx.save()
    ctx.translate(x, y)

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, s * 5, s * 5, s * 4.8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.dressLo
    ctx.beginPath()
    ctx.ellipse(0, s * 5.5, s * 4.5, s * 4.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.dress
    ctx.beginPath()
    ctx.ellipse(0, s * 5, s * 4.2, s * 3.8, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.arc(-s * 1, -s * 5, s * 4.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.skinLo
    ctx.beginPath()
    ctx.arc(-s * 1, -s * 5, s * 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.skin
    ctx.beginPath()
    ctx.arc(-s * 1, -s * 5.5, s * 3.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.hairMom
    ctx.beginPath()
    ctx.arc(-s * 1, -s * 7, s * 4, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(-s * 3.5, -s * 5, s * 2.5, s * 3.5, -0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.eye
    ctx.beginPath()
    ctx.arc(-s * 2, -s * 5.5, s * 0.7, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawSeatedBoy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
  ): void {
    const s = size / 16
    ctx.save()
    ctx.translate(x, y)

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, s * 4, s * 4.5, s * 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.boyShorts
    ctx.fillRect(-s * 3.5, s * 2, s * 7, s * 3)
    ctx.fillStyle = P.boyShirt
    ctx.beginPath()
    ctx.ellipse(0, s * 3, s * 4, s * 3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.arc(0, -s * 3.5, s * 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = P.skin
    ctx.beginPath()
    ctx.arc(0, -s * 4, s * 3.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.hairBoy
    ctx.beginPath()
    ctx.arc(0, -s * 5.5, s * 3.2, Math.PI, 0)
    ctx.fill()

    ctx.fillStyle = P.eye
    ctx.beginPath()
    ctx.arc(s * 0.8, -s * 4, s * 0.6, 0, Math.PI * 2)
    ctx.arc(-s * 0.8, -s * 4, s * 0.6, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  private drawShore(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grassY = h * 0.4

    ctx.fillStyle = P.grassMid
    ctx.fillRect(0, grassY, w, h * 0.045)

    ctx.fillStyle = P.grassHi
    for (let x = 0; x < w; x += w / 18) {
      const tuft = (x * 3) % 4
      ctx.fillRect(x, grassY - tuft, w / 50, h * 0.018)
    }

    ctx.fillStyle = P.sand
    ctx.fillRect(0, h * 0.442, w, h * 0.02)
    ctx.fillStyle = P.sandLo
    ctx.fillRect(0, h * 0.46, w, h * 0.015)
  }

  private drawWater(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const waterY = h * 0.473
    const bands = [P.waterHi, P.waterMid, P.waterLo, P.waterDeep]
    const bandH = (h - waterY) / bands.length

    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i]
      ctx.fillRect(0, waterY + i * bandH, w, i === bands.length - 1 ? h - waterY - i * bandH : bandH)
    }

    if (!this.prefersReducedMotion) {
      ctx.fillStyle = P.sparkle
      const step = Math.max(3, w / 40)
      for (let x = 0; x < w; x += step) {
        if (Math.sin(t * 1.3 + x * 0.015) > 0.35) {
          const wave = Math.sin(t * 1.1 + x * 0.02) * 2
          ctx.fillRect(x, waterY + 4 + wave, 3, 2)
        }
      }
    }
  }

  private drawReeds(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    for (let i = 0; i < 7; i++) {
      const x = w * (0.05 + (i / 7) * 0.9)
      const sway = this.prefersReducedMotion ? 0 : Math.sin(t * 1.1 + i) * 2
      const reedH = h * (0.04 + (i % 3) * 0.01)

      ctx.strokeStyle = P.reed
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, h * 0.44 + reedH * 0.1)
      ctx.quadraticCurveTo(x + sway, h * 0.44, x + sway * 1.2, h * 0.44 - reedH)
      ctx.stroke()

      ctx.fillStyle = P.grassHi
      ctx.beginPath()
      ctx.ellipse(x + sway * 1.2, h * 0.44 - reedH, 3, 4, 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawEntities(now: number): void {
    for (const entity of this.entities) {
      if (entity.kind === 'egg') {
        const bob = this.prefersReducedMotion
          ? 0
          : Math.sin(now * 0.003 + entity.bobPhase) * Math.max(1, entity.size * 0.06)
        this.drawEgg(entity.x, entity.y + bob, entity.size, now - entity.spawnTime)
        continue
      }

      if (entity.flying) {
        this.drawFlyingGoose(entity, now)
        continue
      }

      const bob = this.prefersReducedMotion
        ? 0
        : Math.sin(now * 0.003 + entity.bobPhase) * Math.max(1, entity.size * 0.06)
      const landAge = now - entity.landedTime
      const popScale = landAge < 400 ? 0.6 + (landAge / 400) * 0.4 : 1
      this.drawGoose(
        entity.x,
        entity.y + bob,
        entity.size * popScale,
        entity.facing,
        'swimming',
        0,
        Math.floor(now / 200) % 2,
      )
    }
  }

  private easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2
  }

  private flightPosition(
    flight: FlyingGoose,
    targetX: number,
    targetY: number,
    t: number,
  ): { x: number; y: number } {
    const u = 1 - t
    return {
      x: u * u * flight.originX + 2 * u * t * flight.arcX + t * t * targetX,
      y: u * u * flight.originY + 2 * u * t * flight.arcY + t * t * targetY,
    }
  }

  private drawFlyingGoose(
    entity: Extract<LakeEntity, { kind: 'goose' }>,
    now: number,
  ): void {
    const flight = entity.flying!
    const rawProgress = Math.min(1, (now - flight.startTime) / FLIGHT_DURATION_MS)
    const progress = this.prefersReducedMotion ? 1 : this.easeInOutSine(rawProgress)
    const pos = this.flightPosition(flight, entity.x, entity.y, progress)

    const ahead = this.flightPosition(flight, entity.x, entity.y, Math.min(1, progress + 0.03))
    const facing: 1 | -1 = ahead.x >= pos.x ? 1 : -1
    const tilt = -0.12 - (1 - progress) * 0.1
    const wingFrame = Math.floor(now / 65) % 2

    this.drawGoose(pos.x, pos.y, entity.size, facing, 'flying', tilt, wingFrame)

    if (progress > 0.88 && !this.prefersReducedMotion) {
      this.drawSplash(entity.x, entity.y, entity.size * ((progress - 0.88) / 0.12))
    }
  }

  private drawSplash(x: number, y: number, size: number): void {
    const ctx = this.ctx
    ctx.fillStyle = P.sparkle
    ctx.beginPath()
    ctx.ellipse(x, y, size * 0.12, size * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x - size * 0.15, y + 2, size * 0.05, size * 0.03, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + size * 0.12, y + 2, size * 0.04, size * 0.025, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawEgg(x: number, y: number, size: number, age: number): void {
    const ctx = this.ctx
    const w = size * 0.45
    const h = size * 0.58
    const wobble = age > HATCH_DELAY_MS - 400 ? Math.sin(age * 0.04) * 2 : 0

    ctx.save()
    ctx.translate(x + wobble, y)

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, 2, w / 2 + 1.5, h / 2 + 1.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.eggLo
    ctx.beginPath()
    ctx.ellipse(0, 1, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.eggMid
    ctx.beginPath()
    ctx.ellipse(0, 0, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.eggHi
    ctx.beginPath()
    ctx.ellipse(-w * 0.12, -h * 0.15, w * 0.2, h * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()

    if (age > HATCH_DELAY_MS - 300) {
      const crack = (age - (HATCH_DELAY_MS - 300)) / 300
      ctx.strokeStyle = P.outline
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(-w * 0.1 * crack, -h * 0.15)
      ctx.lineTo(0, h * 0.05 * crack)
      ctx.lineTo(w * 0.12 * crack, -h * 0.08)
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawGoose(
    x: number,
    y: number,
    size: number,
    facing: 1 | -1,
    pose: 'swimming' | 'flying',
    tilt = 0,
    wingFrame = 0,
  ): void {
    if (pose === 'swimming') {
      this.drawSwimmingGoose(x, y, size, facing, wingFrame)
      return
    }

    const ctx = this.ctx
    const s = size / 24

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tilt * facing)
    ctx.scale(facing, 1)

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, s * 3, s * 9, s * 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.gooseLo
    ctx.beginPath()
    ctx.ellipse(0, s * 2.5, s * 9, s * 4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.gooseMid
    ctx.beginPath()
    ctx.ellipse(-s * 2, s * 3, s * 6, s * 3.5, 0, 0, Math.PI * 2)
    ctx.fill()

    this.drawFlyingWings(ctx, s, wingFrame)

    ctx.strokeStyle = P.outline
    ctx.lineWidth = s * 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(s * 5, s * 0.5)
    ctx.quadraticCurveTo(s * 7.5, -s * 5, s * 8.5, -s * 9)
    ctx.stroke()

    ctx.strokeStyle = P.gooseHi
    ctx.lineWidth = s * 1.8
    ctx.beginPath()
    ctx.moveTo(s * 5, s * 0.5)
    ctx.quadraticCurveTo(s * 7.5, -s * 5, s * 8.5, -s * 9)
    ctx.stroke()

    this.drawGooseHead(ctx, s, s * 9, -s * 9)
    ctx.restore()
  }

  private drawSwimmingGoose(
    x: number,
    y: number,
    size: number,
    facing: 1 | -1,
    wingFrame: number,
  ): void {
    const ctx = this.ctx
    const s = size / 24

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(facing, 1)

    ctx.strokeStyle = 'rgba(120, 190, 240, 0.55)'
    ctx.lineWidth = s * 1.1
    ctx.beginPath()
    ctx.ellipse(0, s * 1.5, s * 12, s * 2.8, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, s * 2.2, s * 9, s * 1.8, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.ellipse(1, s * 2.5, s * 10, s * 3.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.gooseLo
    ctx.beginPath()
    ctx.ellipse(0, s * 2, s * 10, s * 2.8, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.gooseMid
    ctx.beginPath()
    ctx.ellipse(-s * 3, s * 1.5, s * 6, s * 2.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.wing
    const wingLift = wingFrame === 0 ? -s * 0.4 : s * 0.2
    ctx.beginPath()
    ctx.ellipse(-s * 1.5, s * 0.5 + wingLift, s * 5.5, s * 2.2, -0.25, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.moveTo(-s * 9, s * 0.5)
    ctx.quadraticCurveTo(-s * 11, -s * 1.5, -s * 8.5, -s * 2.5)
    ctx.quadraticCurveTo(-s * 7, -s * 1, -s * 7.5, s * 1.5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = P.gooseLo
    ctx.beginPath()
    ctx.moveTo(-s * 8.5, s * 0.5)
    ctx.quadraticCurveTo(-s * 10.5, -s * 1.2, -s * 8.2, -s * 2.2)
    ctx.quadraticCurveTo(-s * 6.8, -s * 0.8, -s * 7.2, s * 1.2)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = P.outline
    ctx.lineWidth = s * 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(s * 2, s * 0.5)
    ctx.quadraticCurveTo(s * 4, -s * 4, s * 5.5, -s * 8)
    ctx.stroke()

    ctx.strokeStyle = P.gooseHi
    ctx.lineWidth = s * 1.5
    ctx.beginPath()
    ctx.moveTo(s * 2, s * 0.5)
    ctx.quadraticCurveTo(s * 4, -s * 4, s * 5.5, -s * 8)
    ctx.stroke()

    this.drawGooseHead(ctx, s, s * 6.5, -s * 8.5)
    ctx.restore()
  }

  private drawGooseHead(
    ctx: CanvasRenderingContext2D,
    s: number,
    headX: number,
    headY: number,
  ): void {
    ctx.fillStyle = P.outline
    ctx.beginPath()
    ctx.arc(headX + 1, headY + 1, s * 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.gooseHi
    ctx.beginPath()
    ctx.arc(headX, headY, s * 3.8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = P.beakLo
    ctx.beginPath()
    ctx.moveTo(headX + s * 3, headY + s * 0.2)
    ctx.quadraticCurveTo(headX + s * 6, headY + s * 1.5, headX + s * 4.8, headY + s * 2.2)
    ctx.quadraticCurveTo(headX + s * 3.8, headY + s * 1.2, headX + s * 3, headY + s * 0.2)
    ctx.fill()

    ctx.fillStyle = P.beak
    ctx.beginPath()
    ctx.moveTo(headX + s * 3, headY + s * 0.2)
    ctx.quadraticCurveTo(headX + s * 5.2, headY + s * 1.2, headX + s * 4.2, headY + s * 1.8)
    ctx.fill()

    ctx.fillStyle = P.eye
    ctx.beginPath()
    ctx.arc(headX + s * 1.2, headY - s * 0.5, s * 0.85, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawFlyingWings(
    ctx: CanvasRenderingContext2D,
    s: number,
    wingFrame: number,
  ): void {
    ctx.fillStyle = P.outline

    if (wingFrame === 0) {
      ctx.beginPath()
      ctx.ellipse(-s * 7, -s * 12, s * 9, s * 3, -0.65, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 0.5, -s * 14, s * 8, s * 2.5, -0.45, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = P.wing
      ctx.beginPath()
      ctx.ellipse(-s * 7, -s * 12.5, s * 8.5, s * 2.5, -0.65, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 0.5, -s * 14.5, s * 7.5, s * 2, -0.45, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = P.gooseHi
      ctx.beginPath()
      ctx.ellipse(-s * 8.5, -s * 13, s * 4, s * 1.5, -0.65, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 1, -s * 15, s * 3.5, s * 1.2, -0.45, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.ellipse(-s * 6, -s * 2, s * 10, s * 3, -0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 0.5, -s * 4, s * 9, s * 2.5, 0.05, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = P.wing
      ctx.beginPath()
      ctx.ellipse(-s * 6, -s * 2.5, s * 9.5, s * 2.5, -0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(s * 0.5, -s * 4.5, s * 8.5, s * 2, 0.05, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = P.gooseLo
      ctx.beginPath()
      ctx.ellipse(-s * 7, -s * 3, s * 4, s * 1.5, -0.15, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}