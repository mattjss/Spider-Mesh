import { createControls } from './Controls'
import { SpiderMesh } from './SpiderMesh'

// --- Click ripple (render only; wave propagates outward, nodes/edges twang visually) ---
interface Ripple {
  x: number
  y: number
  startTime: number
  duration: number
  speed: number
  amplitude: number
}

// Tuned for a soft, low-gravity / water-like ripple with stronger web-like reverb.
const RIPPLE_DURATION = 3600
const RIPPLE_SPEED = 0.6
const RIPPLE_AMPLITUDE = 14
const RIPPLE_FREQUENCY = 0.08
const RIPPLE_DAMPING = 0.0008

const activeRipples: Ripple[] = []

function computeRippleOffset(
  node: { x: number; y: number },
  ripples: Ripple[],
  now: number
): { dx: number; dy: number } {
  let dx = 0
  let dy = 0
  for (const r of ripples) {
    const dist = Math.hypot(node.x - r.x, node.y - r.y)
    const elapsed = now - r.startTime
    if (elapsed < 0 || elapsed > r.duration) continue

    // Single outward-moving, low-gravity bump with gentle reverb:
    // - radius grows over time
    // - smooth cosine-based envelope around the ring
    // - subtle sinusoidal tail so the fabric lightly shimmers after the main push
    const radius = elapsed * r.speed
    const band = dist - radius

    // How close we are to the ring, normalized to a soft width.
    const width = 100 // slightly tighter ring for more pronounced motion
    const t = band / width
    if (Math.abs(t) > 1.2) continue

    // Cosine lobe: smooth peak at the ring, falling to zero at the edges.
    const envelope = Math.max(0, Math.cos(t * Math.PI * 0.5))

    // Very gentle time-based decay for low-gravity feel.
    const temporal = Math.exp(-elapsed * RIPPLE_DAMPING)

    // Primary bump.
    let offset = r.amplitude * envelope * temporal

    // Add a smoother reverb component behind the main ring.
    const tail = -Math.sin((band / width) * Math.PI * 0.5) * 0.75
    const tailTemporal = Math.exp(-elapsed * RIPPLE_DAMPING * 1.2)
    offset += r.amplitude * tail * temporal * tailTemporal * RIPPLE_FREQUENCY

    // Light underdamped feel in time, like a web that overshoots a bit.
    const timeReverb = 1 + 0.5 * Math.sin(elapsed * 0.01)
    offset *= timeReverb

    const nx = node.x - r.x
    const ny = node.y - r.y
    const len = Math.hypot(nx, ny) || 1
    dx += (nx / len) * offset
    dy += (ny / len) * offset
  }
  return { dx, dy }
}

// --- Main app ---
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const { params, pane } = createControls()
document.body.appendChild((pane as { element: HTMLElement }).element)

const paramsRef = { current: params }
const spiderMesh = new SpiderMesh(paramsRef)

// Palette of spider colors to cycle through on right-click.
const SPIDER_COLORS = ['#ff6b35', '#ffd93b', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c']
let spiderColorIndex = 0

function cycleSpiderColor(): void {
  spiderColorIndex = (spiderColorIndex + 1) % SPIDER_COLORS.length
  const next = SPIDER_COLORS[spiderColorIndex]
  paramsRef.current.particleColor = next
}

function resize(): void {
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w
  canvas.height = h
  spiderMesh.resize(w, h)
}
resize()
window.addEventListener('resize', resize)

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  spiderMesh.setCursor(x, y)
})
canvas.addEventListener('mouseleave', () => spiderMesh.clearCursor())

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  // Only one ripple at a time
  activeRipples.length = 0
  const nowMs = performance.now()
  activeRipples.push({
    x,
    y,
    startTime: nowMs,
    duration: RIPPLE_DURATION,
    speed: RIPPLE_SPEED,
    amplitude: RIPPLE_AMPLITUDE,
  })
  spiderMesh.setLastRippleTime(nowMs)
})

// Right-click: cycle spider color through a preset palette.
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  cycleSpiderColor()
})

let last = performance.now()
function loop(now: number): void {
  const deltaMs = now - last
  last = now
  spiderMesh.update(deltaMs)
  for (let i = activeRipples.length - 1; i >= 0; i--) {
    if (now - activeRipples[i].startTime > activeRipples[i].duration) {
      activeRipples.splice(i, 1)
    }
  }
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const getRippleOffset = (node: { x: number; y: number }) =>
    computeRippleOffset(node, activeRipples, now)
  spiderMesh.draw(ctx, getRippleOffset, now)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
