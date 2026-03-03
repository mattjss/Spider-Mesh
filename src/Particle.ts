/** Particle: rest (x,y), display (displayX, displayY), scale/opacity with targets for smooth fade. */
export class Particle {
  displayX: number
  displayY: number
  scale: number
  opacity: number
  targetScale: number
  targetOpacity: number
  isActive: boolean

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly id: number
  ) {
    this.displayX = x
    this.displayY = y
    this.scale = 1
    this.opacity = 0.3
    this.targetScale = 1
    this.targetOpacity = 0.3
    this.isActive = false
  }

  update(fadeInSpeed: number, fadeOutSpeed: number): void {
    this.displayX += (this.x - this.displayX) * 0.15
    this.displayY += (this.y - this.displayY) * 0.15
    const speed = this.isActive ? fadeInSpeed : fadeOutSpeed
    this.scale += (this.targetScale - this.scale) * speed
    this.opacity += (this.targetOpacity - this.opacity) * speed
  }

  draw(
    ctx: CanvasRenderingContext2D,
    color: string,
    particleMinSize: number,
    particleMaxSize: number,
    offsetX = 0,
    offsetY = 0,
    overrideOpacity?: number
  ): void {
    const size =
      particleMinSize +
      (particleMaxSize - particleMinSize) * ((this.scale - 1) / 2)
    const x = this.displayX + offsetX
    const y = this.displayY + offsetY
    ctx.fillStyle = color
    ctx.globalAlpha = overrideOpacity ?? this.opacity
    ctx.fillRect(x - size / 2, y - size / 2, size, size)
  }
}
