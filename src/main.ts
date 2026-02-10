import { createControls } from './Controls'
import { SpiderMesh } from './SpiderMesh'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const { params, pane } = createControls()
document.body.appendChild((pane as { element: HTMLElement }).element)

const paramsRef = { current: params }
const spiderMesh = new SpiderMesh(paramsRef)

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

let last = performance.now()
function loop(now: number): void {
  const deltaMs = now - last
  last = now
  spiderMesh.update(deltaMs)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  spiderMesh.draw(ctx)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
