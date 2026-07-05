import { beforeEach, describe, expect, it } from 'vitest'
import { installMobileShell, resetViewportZoom } from '../src/mobileShell'

describe('mobileShell', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <div id="app"></div>
    `
  })

  it('installMobileShell runs without error when #app exists', () => {
    expect(() => installMobileShell()).not.toThrow()
  })

  it('resetViewportZoom restores the locked viewport meta content', () => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')!
    meta.content = 'width=device-width, initial-scale=2'

    resetViewportZoom()

    expect(meta.content).toContain('maximum-scale=1.01')

    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(meta.content).toBe(
          'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        )
        resolve()
      })
    })
  })
})