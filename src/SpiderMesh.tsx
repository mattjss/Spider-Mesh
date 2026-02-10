import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export interface SpiderMeshParams {
  gridSize: number
  nodeBaseSize: number
  nodeActiveSize: number
  interactionRadius: number
  springStiffness: number
  springDamping: number
  nodeInactiveOpacity: number
  nodeActiveOpacity: number
  lineOpacity: number
  nodeColor: string
  lineColor: string
}

const tempVec3 = new THREE.Vector3()
const tempVec2 = new THREE.Vector2()
const tempColor = new THREE.Color()
const tempMatrix = new THREE.Matrix4()

/** Grid index to row/col */
function indexToRowCol(idx: number, n: number) {
  const i = Math.floor(idx / n)
  const j = idx % n
  return { i, j }
}

/** Get 8-connected grid neighbor indices (no diagonal = 4-connected; with diagonal = 8) */
function getGridNeighbors(centerIndex: number, n: number): number[] {
  const { i, j } = indexToRowCol(centerIndex, n)
  const out: number[] = []
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue
      const ni = i + di
      const nj = j + dj
      if (ni >= 0 && ni < n && nj >= 0 && nj < n) out.push(ni * n + nj)
    }
  }
  return out
}

interface SpiderMeshProps {
  paramsRef: React.MutableRefObject<SpiderMeshParams>
}

export default function SpiderMesh({ paramsRef }: SpiderMeshProps) {
  const { camera, pointer } = useThree()
  const dotsRef = useRef<THREE.InstancedMesh>(null)
  const squaresRef = useRef<THREE.InstancedMesh>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const mouseRef = useRef(new THREE.Vector3(0, 0, 0))
  const positionsRef = useRef<THREE.Vector3[]>([])
  const activeRef = useRef<Float32Array>(new Float32Array(0))
  const velocityRef = useRef<Float32Array>(new Float32Array(0))
  const lineStrengthRef = useRef(0)

  const { gridSize } = paramsRef.current

  const { positions } = useMemo(() => {
    const n = gridSize
    const positions: THREE.Vector3[] = []
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (j / Math.max(1, n - 1)) * 2 - 1
        const y = (i / Math.max(1, n - 1)) * 2 - 1
        positions.push(new THREE.Vector3(x, y, 0))
      }
    }
    positionsRef.current = positions
    const len = positions.length
    activeRef.current = new Float32Array(len)
    velocityRef.current = new Float32Array(len)
    return { positions }
  }, [gridSize])

  const N = positions.length
  const n = gridSize
  const maxLines = 8
  const linePositions = useMemo(() => new Float32Array(maxLines * 2 * 3), [])

  const [dotGeo, squareGeo, lineGeo] = useMemo(() => {
    const dot = new THREE.CircleGeometry(1, 12)
    const square = new THREE.PlaneGeometry(1, 1)
    const line = new THREE.BufferGeometry()
    line.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    return [dot, square, line]
  }, [linePositions])

  useFrame((_, delta) => {
    const params = paramsRef.current
    if (!dotsRef.current || !squaresRef.current || !linesRef.current) return

    tempVec2.set(pointer.x, pointer.y)
    tempVec3.set(tempVec2.x, tempVec2.y, 0)
    tempVec3.unproject(camera)
    const dir = tempVec3.sub(camera.position).normalize()
    const dist = -camera.position.z / dir.z
    mouseRef.current.copy(camera.position).addScaledVector(dir, dist)

    const mouse = mouseRef.current
    const positions = positionsRef.current

    let centerIndex = -1
    let minDist = params.interactionRadius
    for (let i = 0; i < N; i++) {
      const d = positions[i].distanceTo(mouse)
      if (d < minDist) {
        minDist = d
        centerIndex = i
      }
    }

    const hubSet = new Set<number>()
    let neighborIndices: number[] = []
    if (centerIndex >= 0) {
      hubSet.add(centerIndex)
      neighborIndices = getGridNeighbors(centerIndex, n)
      neighborIndices.forEach((idx) => hubSet.add(idx))
    }

    const dt = Math.min(delta * 60, 2)
    const stiffness = params.springStiffness * dt
    const damping = Math.pow(params.springDamping, dt)
    const active = activeRef.current
    const velocity = velocityRef.current

    for (let i = 0; i < N; i++) {
      const target = hubSet.has(i) ? 1 : 0
      let v = velocity[i]
      let a = active[i]
      v += (target - a) * stiffness
      v *= damping
      a += v
      a = THREE.MathUtils.clamp(a, 0, 1)
      velocity[i] = v
      active[i] = a
    }

    const baseSize = params.nodeBaseSize
    const activeSize = params.nodeActiveSize
    const scaleVec = new THREE.Vector3(1, 1, 1)

    for (let i = 0; i < N; i++) {
      const p = positions[i]
      const a = active[i]
      const dotScale = baseSize * (1 - a)
      const squareScale = activeSize * a

      tempMatrix.identity()
      tempMatrix.makeTranslation(p.x, p.y, p.z)
      tempMatrix.scale(scaleVec.setScalar(dotScale))
      dotsRef.current.setMatrixAt(i, tempMatrix)
      tempColor.set(params.nodeColor)
      tempColor.multiplyScalar(0.3 + 0.7 * (1 - a) * params.nodeInactiveOpacity + 0.7 * a * params.nodeActiveOpacity)
      dotsRef.current.setColorAt(i, tempColor)

      tempMatrix.identity()
      tempMatrix.makeTranslation(p.x, p.y, p.z + 0.001)
      tempMatrix.scale(scaleVec.setScalar(squareScale))
      squaresRef.current.setMatrixAt(i, tempMatrix)
      tempColor.set(params.nodeColor)
      tempColor.multiplyScalar(0.5 + 0.5 * params.nodeActiveOpacity)
      squaresRef.current.setColorAt(i, tempColor)
    }
    dotsRef.current.instanceMatrix.needsUpdate = true
    if (dotsRef.current.instanceColor) dotsRef.current.instanceColor.needsUpdate = true
    squaresRef.current.instanceMatrix.needsUpdate = true
    if (squaresRef.current.instanceColor) squaresRef.current.instanceColor.needsUpdate = true

    const targetLineStrength = centerIndex >= 0 ? 1 : 0
    lineStrengthRef.current += (targetLineStrength - lineStrengthRef.current) * (1 - Math.exp(-8 * delta * 60))

    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    let idx = 0
    if (centerIndex >= 0 && neighborIndices.length > 0) {
      const center = positions[centerIndex]
      const cx = center.x
      const cy = center.y
      const cz = center.z
      for (const i of neighborIndices) {
        const q = positions[i]
        posArray[idx++] = cx
        posArray[idx++] = cy
        posArray[idx++] = cz
        posArray[idx++] = q.x
        posArray[idx++] = q.y
        posArray[idx++] = q.z
      }
    }
    while (idx < posArray.length) {
      posArray[idx++] = 0
      posArray[idx++] = 0
      posArray[idx++] = 0
      posArray[idx++] = 0
      posArray[idx++] = 0
      posArray[idx++] = 0
    }
    posAttr.needsUpdate = true
    const lineCount = neighborIndices.length
    linesRef.current.geometry.setDrawRange(0, lineCount * 2)

    const mat = linesRef.current.material as THREE.LineBasicMaterial
    mat.opacity = params.lineOpacity * lineStrengthRef.current
  })

  return (
    <group>
      <instancedMesh ref={dotsRef} args={[dotGeo, undefined, N]} frustumCulled={false}>
        <meshBasicMaterial
          vertexColors={true}
          transparent
          opacity={1}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={squaresRef} args={[squareGeo, undefined, N]} frustumCulled={false}>
        <meshBasicMaterial
          vertexColors={true}
          transparent
          opacity={1}
          toneMapped={false}
          depthWrite={false}
        />
      </instancedMesh>
      <lineSegments ref={linesRef} geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          color={paramsRef.current.lineColor}
          transparent
          opacity={paramsRef.current.lineOpacity * lineStrengthRef.current}
          toneMapped={false}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}
