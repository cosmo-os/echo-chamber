import { spawn, spawnSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT ?? 5173)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(rootDir, 'node_modules', '.bin', 'vite')

const cloudflaredCandidates = [
  '/opt/homebrew/bin/cloudflared',
  '/usr/local/bin/cloudflared',
  'cloudflared',
]

function resolveCloudflared() {
  for (const candidate of cloudflaredCandidates) {
    if (candidate.includes('/')) {
      try {
        accessSync(candidate, constants.X_OK)
        return candidate
      } catch {
        continue
      }
    }

    const found = spawnSync('which', [candidate], { encoding: 'utf8' })
    if (found.status === 0) {
      return found.stdout.trim()
    }
  }

  return null
}

function getLanAddresses() {
  const addresses = []

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) continue

    for (const iface of interfaces) {
      const isIPv4 = iface.family === 'IPv4' || iface.family === 4
      if (isIPv4 && !iface.internal) {
        addresses.push(iface.address)
      }
    }
  }

  return [...new Set(addresses)]
}

const cloudflared = resolveCloudflared()
if (!cloudflared) {
  console.error('cloudflared not found. Install it with: brew install cloudflared')
  process.exit(1)
}

const children = []
let tunnelUrl = null
let tunnelStarted = false

function shutdown() {
  for (const child of children) {
    child.kill('SIGTERM')
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function printReady(url) {
  console.log('\n========================================')
  console.log('  Ready! Open on your phone:')
  console.log(`  ${url}`)
  console.log('========================================')
  console.log('Tap Start on the page, then allow microphone access.\n')
}

function maybeStartTunnel() {
  if (tunnelStarted) return
  tunnelStarted = true

  const tunnel = spawn(
    cloudflared,
    ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'],
    { stdio: ['inherit', 'pipe', 'pipe'] },
  )
  children.push(tunnel)

  const onData = (chunk) => {
    const text = chunk.toString()
    process.stderr.write(text)

    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (match && !tunnelUrl) {
      tunnelUrl = match[0]
      printReady(tunnelUrl)
    }
  }

  tunnel.stdout.on('data', onData)
  tunnel.stderr.on('data', onData)

  tunnel.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`cloudflared exited with code ${code}`)
      shutdown()
    }
  })
}

const ips = getLanAddresses()

console.log('\nMobile dev')
console.log('----------')
console.log(`Local:  http://localhost:${PORT}`)
if (ips.length === 0) {
  console.log('LAN:    (no IPv4 address found)')
} else {
  for (const ip of ips) {
    console.log(`LAN:    http://${ip}:${PORT} (mic blocked without HTTPS)`)
  }
}
console.log('\nStarting dev server and HTTPS tunnel...\n')

const vite = spawn(viteBin, ['--host', '--port', String(PORT)], {
  cwd: rootDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, MOBILE_DEV: '1' },
})
children.push(vite)

vite.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  if (chunk.toString().includes('ready in')) {
    setTimeout(maybeStartTunnel, 300)
  }
})

vite.stderr.on('data', (chunk) => {
  process.stderr.write(chunk)
})

vite.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    process.exit(code)
  }
  shutdown()
})