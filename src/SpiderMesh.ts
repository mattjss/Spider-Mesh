import { Particle } from './Particle'
import type { Params } from './Controls'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  }
}

// Deterministic per-particle phase to break up visible directional patterns.
function particlePhase(id: number): number {
  const s = Math.sin(id * 12.9898) * 43758.5453
  return s - Math.floor(s) // 0–1
}

export class SpiderMesh {
  private particles: Particle[] = []
  private cursorX = -1000
  private cursorY = -1000
  private cursorActive = false
  private currentNeighbors: Particle[] = []
  private lastRippleTimeMs = -Infinity
  private shimmerStrengths: number[] = []

  constructor(private paramsRef: { current: Params }) {}

  setCursor(x: number, y: number): void {
    this.cursorX = x
    this.cursorY = y
    this.cursorActive = true
  }

  clearCursor(): void {
    this.cursorActive = false
  }

  setLastRippleTime(timeMs: number): void {
    this.lastRippleTimeMs = timeMs
  }

  resize(width: number, height: number): void {
    const spacing = this.paramsRef.current.gridSpacing
    const cols = Math.ceil(width / spacing) + 1
    const rows = Math.ceil(height / spacing) + 1
    this.particles = []
    this.shimmerStrengths = []
    let id = 0
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        this.particles.push(new Particle(j * spacing, i * spacing, id))
        this.shimmerStrengths.push(0)
        id++
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

    const pullElasticity = this.paramsRef.current.pullElasticity ?? 0
    const pullFactor = 1 + pullElasticity

    this.particles.forEach((p) => {
      p.isActive = neighborIds.has(p.id)
      if (p.isActive) {
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const targetX = p.x + dx * pullStrength
        const targetY = p.y + dy * pullStrength
        p.displayX += (targetX - p.displayX) * pullFactor
        p.displayY += (targetY - p.displayY) * pullFactor
        p.targetScale = 3
        p.targetOpacity = 1
      } else {
        p.targetScale = 1
        p.targetOpacity = 0.3
      }
      p.update(fadeInSpeed, fadeOutSpeed)
    })
  }

  draw(
    ctx: CanvasRenderingContext2D,
    getRippleOffset: (node: { x: number; y: number }) => { dx: number; dy: number } | undefined,
    timeMs: number
  ): void {
    const params = this.paramsRef.current
    const mouseX = this.cursorX
    const mouseY = this.cursorY
    const noOffset = { dx: 0, dy: 0 }
    const hubOff = getRippleOffset ? getRippleOffset({ x: mouseX, y: mouseY }) : noOffset
    const hx = mouseX + hubOff.dx
    const hy = mouseY + hubOff.dy
    const baseRgb = hexToRgb(params.particleColor)
    const shimmerDecayMs = 5000
    const sinceRipple = timeMs - this.lastRippleTimeMs
    const shimmerTemporal =
      sinceRipple >= 0 && this.lastRippleTimeMs !== -Infinity
        ? Math.exp(-sinceRipple / shimmerDecayMs)
        : 0

    ctx.save()
    ctx.translate(0.5, 0.5)

    // Lines to neighbors (legs), using ripple-offset positions so edges twang
    this.currentNeighbors.forEach((p) => {
      const pOff = getRippleOffset ? getRippleOffset(p) : noOffset
      const px = p.displayX + pOff.dx
      const py = p.displayY + pOff.dy
      const distance = Math.hypot(p.displayX - mouseX, p.displayY - mouseY)
      const alpha = Math.max(0.3, 1 - distance / params.maxDistance) * 0.8
      ctx.strokeStyle = params.particleColor
      ctx.globalAlpha = alpha
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(px, py)
      ctx.stroke()
    })
    ctx.globalAlpha = 1

    // All particles (grid fabric + active spider), offset by ripple.
    // Grid dots get a metallic shimmer as the ripple passes over them, then
    // dance in place like stars while their stored shimmer strength decays.
    this.particles.forEach((p, index) => {
      const off = getRippleOffset ? getRippleOffset(p) : noOffset
      let color = params.particleColor
      let alphaOverride: number | undefined

      // Only shimmer the fabric, not the active spider neighbors.
      if (!p.isActive && shimmerTemporal > 0) {
        // 1) Update this particle's stored shimmer strength when the ripple hits it.
        const rippleMag = getRippleOffset ? Math.hypot(off.dx, off.dy) : 0
        const scale = 9 // how wide the shimmer band is around the ring
        const local = Math.min(1, rippleMag / scale)

        let stored = this.shimmerStrengths[index] ?? 0
        if (local > 0.02) {
          // Kick up shimmer strength when the ring passes; clamp to 1.
          stored = Math.min(1, stored + local * 0.9)
        }

        // 2) Decay stored shimmer over time (about 5s via shimmerTemporal).
        stored *= 0.975 + 0.02 * shimmerTemporal
        this.shimmerStrengths[index] = stored

        if (stored > 0.01) {
          // 3) Convert stored shimmer into a dancing glisten with no sweep pattern.
          const phase = particlePhase(p.id) * Math.PI * 2
          const twinkle =
            0.5 +
            0.5 *
              Math.sin(
                // per-particle random phase + time-based oscillation
                phase + timeMs * 0.01
              )
          const strength = stored * twinkle

          // Brighten toward a metal-tinted version of the current spider color (no harsh white).
          const boost = 140 * strength
          const r = Math.min(255, baseRgb.r + boost)
          const g = Math.min(255, baseRgb.g + boost)
          const b = Math.min(255, baseRgb.b + boost)
          color = `rgb(${r | 0}, ${g | 0}, ${b | 0})`

          // Temporarily boost opacity so shimmer reads clearly, but still soft.
          alphaOverride = Math.min(1, p.opacity + 0.9 * strength)
        }
      }

      p.draw(
        ctx,
        color,
        params.particleMinSize,
        params.particleMaxSize,
        off.dx,
        off.dy,
        alphaOverride
      )
    })

    // Hub at cursor (only when there are neighbors)
    if (this.currentNeighbors.length > 0) {
      ctx.globalAlpha = 1
      ctx.fillStyle = params.particleColor
      const h = params.hubSize / 2
      ctx.fillRect(hx - h, hy - h, params.hubSize, params.hubSize)
    }

    ctx.restore()
  }
}
