import './style.css'
import { EchoEngine } from './audio/EchoEngine.ts'
import { installMobileShell } from './mobileShell.ts'
import { App } from './ui/App.ts'

installMobileShell()

const root = document.querySelector<HTMLDivElement>('#app')!

let engine: EchoEngine | null = null

new App(root, () => {
  engine ??= new EchoEngine({
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    createAudioContext: () => new AudioContext(),
  })
  return engine
})