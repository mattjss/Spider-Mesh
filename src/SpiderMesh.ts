import { Particle } from './Particle'
import type { Params } from './Controls'

export class SpiderMesh {
  private particles: Particle[] = []
  private cursorX = -1000
  private cursorY = -1000
  private cursorActive = false
  private currentNeighbors: Particle[] = []

  constructor(private paramsRef: { current: Params }) {}

  setCursor(x: number, y: number): void {
    this.cursorX = x
    this.cursorY = y
    this.cursorActive = true
  }

  clearCursor(): void {
    this.cursorActive = false
  }

  resize(width: number, height: number): void {
    const spacing = this.paramsRef.current.gridSpacing
    const cols = Math.ceil(width / spacing) + 1
    const rows = Math.ceil(height / spacing) + 1
    this.particles = []
    let id = 0
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        this.particles.push(new Particle(j * spacing, i * spacing, id++))
      }
    }
    this.currentNeighbors = []
  }

  update(_deltaMs: number): void {
    const { neighborCount, maxDistance, pullStrength, fadeInSpeed, fadeOutSpeed } =
      this.paramsRef.current
    const mouseX = this.cursorX
    const mouseY = this.cursorY

    const distances = this.particles.map((p) => ({
      particle: p,
      distance: Math.hypot(p.x - mouseX, p.y - mouseY),
    }))

    const neighbors = this.cursorActive
      ? distances
          .filter((d) => d.distance < maxDistance)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, neighborCount)
          .map((d) => d.particle)
      : []

    this.currentNeighbors = neighbors
    const neighborIds = new Set(neighbors.map((p) => p.id))

    this.particles.forEach((p) => {
      p.isActive = neighborIds.has(p.id)
      if (p.isActive) {
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        p.displayX = p.x + dx * pullStrength
        p.displayY = p.y + dy * pullStrength
        p.targetScale = 3
        p.targetOpacity = 1
      } else {
        p.targetScale = 1
        p.targetOpacity = 0.3
      }
      p.update(fadeInSpeed, fadeOutSpeed)
    })
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const params = this.paramsRef.current
    const mouseX = this.cursorX
    const mouseY = this.cursorY

    ctx.save()
    ctx.translate(0.5, 0.5)

    // Lines to neighbors
    this.currentNeighbors.forEach((p) => {
      const distance = Math.hypot(p.displayX - mouseX, p.displayY - mouseY)
      const alpha = Math.max(0, 1 - distance / params.maxDistance) * 0.6
      ctx.strokeStyle = `rgba(255, 107, 53, ${alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(mouseX, mouseY)
      ctx.lineTo(p.displayX, p.displayY)
      ctx.stroke()
    })

    // All particles
    this.particles.forEach((p) =>
      p.draw(ctx, params.particleColor, params.particleMinSize, params.particleMaxSize)
    )

    // Hub at cursor (only when there are neighbors)
    if (this.currentNeighbors.length > 0) {
      ctx.globalAlpha = 1
      ctx.fillStyle = params.particleColor
      const h = params.hubSize / 2
      ctx.fillRect(mouseX - h, mouseY - h, params.hubSize, params.hubSize)
    }

    ctx.restore()
  }
}
