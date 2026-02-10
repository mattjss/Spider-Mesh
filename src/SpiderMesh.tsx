import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export interface SpiderMeshParams {
  gridSize: number
  nodeBaseSize: number
  nodeActiveSize: number
  interactionRadius: number
  connectionRadius: number
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

interface SpiderMeshProps {
  paramsRef: React.MutableRefObject<SpiderMeshParams>
}

export default function SpiderMesh({ paramsRef }: SpiderMeshProps) {
  const { camera, pointer } = useThree()
  const instancedRef = useRef<THREE.InstancedMesh>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const mouseRef = useRef(new THREE.Vector3(0, 0, 0))
  const positionsRef = useRef<THREE.Vector3[]>([])

  const { gridSize } = paramsRef.current

  const { positions } = useMemo(() => {
    const n = gridSize
    const positions: THREE.Vector3[] = []
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (j / (n - 1)) * 2 - 1
        const y = (i / (n - 1)) * 2 - 1
        positions.push(new THREE.Vector3(x, y, 0))
      }
    }
    positionsRef.current = positions
    return { positions }
  }, [gridSize])

  const lineCount = gridSize * gridSize * 2
  const linePositions = useMemo(() => new Float32Array(lineCount * 3), [lineCount])

  const [geo, lineGeo] = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1)
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    return [plane, lineGeo]
  }, [linePositions])

  useFrame(() => {
    const params = paramsRef.current
    if (!instancedRef.current || !linesRef.current) return

    tempVec2.set(pointer.x, pointer.y)
    tempVec3.set(tempVec2.x, tempVec2.y, 0)
    tempVec3.unproject(camera)
    const dir = tempVec3.sub(camera.position).normalize()
    const dist = -camera.position.z / dir.z
    mouseRef.current.copy(camera.position).addScaledVector(dir, dist)

    const mouse = mouseRef.current
    const positions = positionsRef.current
    const N = positions.length

    let centerIndex = -1
    let minDist = params.interactionRadius

    for (let i = 0; i < N; i++) {
      const p = positions[i]
      const d = p.distanceTo(mouse)
      if (d < minDist) {
        minDist = d
        centerIndex = i
      }
    }

    const center = centerIndex >= 0 ? positions[centerIndex] : null
    const activeSet = new Set<number>()
    if (center) {
      for (let i = 0; i < N; i++) {
        if (positions[i].distanceTo(center) <= params.connectionRadius) activeSet.add(i)
      }
    }

    const scale = new THREE.Vector3(1, 1, 1)
    tempColor.set(params.nodeColor)

    for (let i = 0; i < N; i++) {
      const p = positions[i]
      const d = mouse.distanceTo(p)
      const t = Math.max(0, 1 - d / params.interactionRadius)
      const s = THREE.MathUtils.lerp(params.nodeBaseSize, params.nodeActiveSize, t)
      tempColor.set(params.nodeColor)
      const dark = new THREE.Color(params.nodeColor).multiplyScalar(0.25)
      tempColor.lerp(dark, 1 - t)
      const opacity = THREE.MathUtils.lerp(params.nodeInactiveOpacity, params.nodeActiveOpacity, t)
      tempColor.multiplyScalar(0.4 + 0.6 * opacity)

      tempMatrix.identity()
      tempMatrix.makeTranslation(p.x, p.y, p.z)
      tempMatrix.scale(scale.setScalar(s))
      instancedRef.current.setMatrixAt(i, tempMatrix)
      instancedRef.current.setColorAt(i, tempColor)
      instancedRef.current.instanceMatrix.needsUpdate = true
      if (instancedRef.current.instanceColor) instancedRef.current.instanceColor.needsUpdate = true
    }

    const posAttr = linesRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    let idx = 0
    if (center && activeSet.size > 0) {
      const cx = center.x
      const cy = center.y
      const cz = center.z
      activeSet.forEach((i) => {
        if (i === centerIndex) return
        const q = positions[i]
        posArray[idx++] = cx
        posArray[idx++] = cy
        posArray[idx++] = cz
        posArray[idx++] = q.x
        posArray[idx++] = q.y
        posArray[idx++] = q.z
      })
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
    linesRef.current.geometry.setDrawRange(0, (idx / 6) * 2)
  })

  return (
    <group>
      <instancedMesh ref={instancedRef} args={[geo, undefined, positions.length]} frustumCulled={false}>
        <meshBasicMaterial
          vertexColors={true}
          transparent
          opacity={1}
          toneMapped={false}
        />
      </instancedMesh>
      <lineSegments ref={linesRef} geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          color={paramsRef.current.lineColor}
          transparent
          opacity={paramsRef.current.lineOpacity}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}
