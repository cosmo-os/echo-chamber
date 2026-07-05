class MockCanvasGradient {
  addColorStop(): void {}
}

class MockCanvasRenderingContext2D {
  canvas = document.createElement('canvas')
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  lineCap: CanvasLineCap = 'butt'
  lineJoin: CanvasLineJoin = 'miter'
  font = ''
  textAlign: CanvasTextAlign = 'left'
  textBaseline: CanvasTextBaseline = 'alphabetic'
  globalAlpha = 1

  fillRect(): void {}
  stroke(): void {}
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  bezierCurveTo(): void {}
  closePath(): void {}
  fill(): void {}
  ellipse(): void {}
  arc(): void {}
  roundRect(): void {}
  save(): void {}
  restore(): void {}
  translate(): void {}
  scale(): void {}
  rotate(): void {}
  fillText(): void {}
  drawImage(): void {}
  putImageData(): void {}

  createLinearGradient(): MockCanvasGradient {
    return new MockCanvasGradient()
  }

  createRadialGradient(): MockCanvasGradient {
    return new MockCanvasGradient()
  }

  getImageData(_x: number, _y: number, width: number, height: number): ImageData {
    return new ImageData(width, height)
  }

  createImageData(width: number, height: number): ImageData {
    return new ImageData(width, height)
  }
}

HTMLCanvasElement.prototype.getContext = function getContext(type: string) {
  if (type === '2d') {
    return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D
  }
  return null
}

if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as typeof ResizeObserver
}