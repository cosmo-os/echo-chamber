const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'

const INSET_EDGES = ['top', 'right', 'bottom', 'left'] as const

type InsetEdge = (typeof INSET_EDGES)[number]

export function resetViewportZoom(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta) {
    return
  }

  meta.content = `${LOCKED_VIEWPORT}, maximum-scale=1.01`
  requestAnimationFrame(() => {
    meta.content = LOCKED_VIEWPORT
  })
}

function measureSafeInset(edge: InsetEdge): number {
  const property = `safe-area-inset-${edge}`
  const isVertical = edge === 'top' || edge === 'bottom'
  const probe = document.createElement('div')

  probe.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'visibility: hidden',
    'pointer-events: none',
    isVertical ? `height: env(${property}, 0px)` : `width: env(${property}, 0px)`,
    isVertical ? 'width: 0' : 'height: 0',
  ].join(';')

  document.documentElement.appendChild(probe)
  const value = isVertical ? probe.offsetHeight : probe.offsetWidth
  probe.remove()
  return value
}

function updateSafeAreaVars(): void {
  const root = document.documentElement

  for (const edge of INSET_EDGES) {
    root.style.setProperty(`--safe-${edge}`, `${measureSafeInset(edge)}px`)
  }
}

function syncVisualViewport(app: HTMLElement): void {
  const viewport = window.visualViewport
  if (!viewport) {
    return
  }

  app.style.top = `${viewport.offsetTop}px`
  app.style.left = `${viewport.offsetLeft}px`
  app.style.width = `${viewport.width}px`
  app.style.height = `${viewport.height}px`

  if (viewport.scale !== 1) {
    resetViewportZoom()
  }
}

function updateStage(app: HTMLElement): void {
  updateSafeAreaVars()
  syncVisualViewport(app)
}

function isRangeSliderTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement && target.type === 'range'
}

function blockMultiTouchZoom(event: TouchEvent): void {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}

function blockGestureZoom(event: Event): void {
  event.preventDefault()
}

function blockScrollZoom(event: TouchEvent): void {
  if (isRangeSliderTarget(event.target)) {
    return
  }

  event.preventDefault()
}

function installViewportStage(app: HTMLElement): void {
  const scheduleUpdate = () => {
    updateStage(app)
  }

  scheduleUpdate()
  window.setTimeout(scheduleUpdate, 100)
  window.setTimeout(scheduleUpdate, 500)

  window.addEventListener('resize', scheduleUpdate)
  window.addEventListener('orientationchange', () => {
    window.setTimeout(scheduleUpdate, 300)
  })
  window.addEventListener('pageshow', scheduleUpdate)

  const viewport = window.visualViewport
  if (viewport) {
    viewport.addEventListener('resize', scheduleUpdate)
    viewport.addEventListener('scroll', scheduleUpdate)
  }
}

function installTouchLock(): void {
  resetViewportZoom()

  window.addEventListener('pageshow', resetViewportZoom)
  window.addEventListener('orientationchange', resetViewportZoom)

  document.addEventListener('touchstart', blockMultiTouchZoom, { passive: false })
  document.addEventListener('touchmove', blockScrollZoom, { passive: false })
  document.addEventListener('gesturestart', blockGestureZoom, { passive: false })
  document.addEventListener('gesturechange', blockGestureZoom, { passive: false })
  document.addEventListener('gestureend', blockGestureZoom, { passive: false })
}

export function installMobileShell(): void {
  const app = document.getElementById('app')
  if (!app) {
    return
  }

  installViewportStage(app)
  installTouchLock()
}