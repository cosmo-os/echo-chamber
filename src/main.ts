import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="shell">
    <h1>Echo Chamber</h1>
    <p class="tagline">Interactive audio echo — coming soon.</p>
    <button id="start" type="button" disabled>Start</button>
    <p class="hint">Audio engine not yet implemented.</p>
  </main>
`