/**
 * Spider Mesh — reference implementation in TypeScript.
 * Standalone canvas version (no Tweakpane).
 */

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

interface Config {
  gridSpacing: number
  neighborCount: number
  maxDistance: number
  pullStrength: number
  fadeInSpeed: number
  fadeOutSpeed: number
  hubSize: number
  particleMinSize: number
  particleMaxSize: number
}

const CONFIG: Config = {
  gridSpacing: 40,
  neighborCount: 18,
  maxDistance: 250,
  pullStrength: 0.12,
  fadeInSpeed: 0.25,
  fadeOutSpeed: 0.08,
  hubSize: 4,
  particleMinSize: 1.5,
  particleMaxSize: 6,
}

let width: number
let height: number
let mouseX = -1000
let mouseY = -1000

class Particle {
  x: number
  y: number
  id: number
  restX: number
  restY: number
  displayX: number
  displayY: number
  scale: number
  opacity: number
  targetScale: number
  targetOpacity: number
  isActive: boolean

  constructor(x: number, y: number, id: number) {
    this.x = x
    this.y = y
    this.id = id
    this.restX = x
    this.restY = y
    this.displayX = x
    this.displayY = y
    this.scale = 1
    this.opacity = 0.3
    this.targetScale = 1
    this.targetOpacity = 0.3
    this.isActive = false
  }

  update(): void {
    this.displayX += (this.restX - this.displayX) * 0.15
    this.displayY += (this.restY - this.displayY) * 0.15
    const speed = this.isActive ? CONFIG.fadeInSpeed : CONFIG.fadeOutSpeed
    this.scale += (this.targetScale - this.scale) * speed
    this.opacity += (this.targetOpacity - this.opacity) * speed
  }

  draw(): void {
    const size =
      CONFIG.particleMinSize +
      (CONFIG.particleMaxSize - CONFIG.particleMinSize) * ((this.scale - 1) / 2)
    ctx.fillStyle = `rgba(255, 107, 53, ${this.opacity})`
    ctx.fillRect(
      this.displayX - size / 2,
      this.displayY - size / 2,
      size,
      size
    )
  }
}

let particles: Particle[] = []

function resize(): void {
  width = canvas.width = window.innerWidth
  height = canvas.height = window.innerHeight
  createGrid()
}

function createGrid(): void {
  particles = []
  let id = 0
  const cols = Math.ceil(width / CONFIG.gridSpacing) + 1
  const rows = Math.ceil(height / CONFIG.gridSpacing) + 1

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = j * CONFIG.gridSpacing
      const y = i * CONFIG.gridSpacing
      particles.push(new Particle(x, y, id++))
    }
  }
}

function animate(): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  const distances = particles.map((p) => ({
    particle: p,
    distance: Math.hypot(p.x - mouseX, p.y - mouseY),
  }))

  const neighbors = distances
    .filter((d) => d.distance < CONFIG.maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, CONFIG.neighborCount)
    .map((d) => d.particle)

  const neighborIds = new Set(neighbors.map((p) => p.id))

  particles.forEach((p) => {
    p.isActive = neighborIds.has(p.id)

    if (p.isActive) {
      const dx = mouseX - p.x
      const dy = mouseY - p.y
      p.displayX = p.x + dx * CONFIG.pullStrength
      p.displayY = p.y + dy * CONFIG.pullStrength
      p.targetScale = 3
      p.targetOpacity = 1
    } else {
      p.targetScale = 1
      p.targetOpacity = 0.3
    }

    p.update()
  })

  neighbors.forEach((p) => {
    const distance = Math.hypot(p.displayX - mouseX, p.displayY - mouseY)
    const alpha = Math.max(0, 1 - distance / CONFIG.maxDistance) * 0.6

    ctx.strokeStyle = `rgba(255, 107, 53, ${alpha})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(mouseX, mouseY)
    ctx.lineTo(p.displayX, p.displayY)
    ctx.stroke()
  })

  particles.forEach((p) => p.draw())

  if (neighbors.length > 0) {
    ctx.fillStyle = 'rgba(255, 107, 53, 1)'
    ctx.fillRect(
      mouseX - CONFIG.hubSize / 2,
      mouseY - CONFIG.hubSize / 2,
      CONFIG.hubSize,
      CONFIG.hubSize
    )
  }

  requestAnimationFrame(animate)
}

window.addEventListener('mousemove', (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
})

window.addEventListener('resize', resize)

resize()
animate()
