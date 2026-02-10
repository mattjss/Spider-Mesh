import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Pane } from 'tweakpane'
import SpiderMesh from './SpiderMesh'
import type { SpiderMeshParams } from './SpiderMesh'

// Tweakpane v4 types don't expose addFolder/addBinding on Pane; runtime supports them
type TweakpaneFolder = { addBinding: (...args: unknown[]) => unknown }
type PaneWithFolder = Pane & {
  addFolder: (opts: { title: string }) => TweakpaneFolder
}

const defaultParams: SpiderMeshParams = {
  gridSize: 16,
  nodeBaseSize: 0.02,
  nodeActiveSize: 0.08,
  interactionRadius: 0.35,
  connectionRadius: 0.4,
  nodeInactiveOpacity: 0.25,
  nodeActiveOpacity: 1,
  lineOpacity: 0.6,
  lineColor: '#cccccc',
  nodeColor: '#ff6b35',
}

function App() {
  const paramsRef = useRef({ ...defaultParams })
  const paneRef = useRef<Pane | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pane = new Pane({ title: 'Spider Mesh' }) as PaneWithFolder
    paneRef.current = pane

    const grid = pane.addFolder({ title: 'Grid' })
    grid.addBinding(paramsRef.current, 'gridSize', { min: 6, max: 32, step: 1 })
    grid.addBinding(paramsRef.current, 'nodeBaseSize', { min: 0.005, max: 0.05, step: 0.005 })
    grid.addBinding(paramsRef.current, 'nodeActiveSize', { min: 0.03, max: 0.2, step: 0.01 })

    const interaction = pane.addFolder({ title: 'Interaction' })
    interaction.addBinding(paramsRef.current, 'interactionRadius', { min: 0.1, max: 0.8, step: 0.05 })
    interaction.addBinding(paramsRef.current, 'connectionRadius', { min: 0.1, max: 0.9, step: 0.05 })

    const appearance = pane.addFolder({ title: 'Appearance' })
    appearance.addBinding(paramsRef.current, 'nodeInactiveOpacity', { min: 0.05, max: 1, step: 0.05 })
    appearance.addBinding(paramsRef.current, 'nodeActiveOpacity', { min: 0.5, max: 1, step: 0.05 })
    appearance.addBinding(paramsRef.current, 'lineOpacity', { min: 0.1, max: 1, step: 0.05 })
    appearance.addBinding(paramsRef.current, 'nodeColor', { label: 'Node color' })
    appearance.addBinding(paramsRef.current, 'lineColor', { label: 'Line color' })

    return () => {
      pane.dispose()
      paneRef.current = null
    }
  }, [])

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 5], zoom: 100, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#000000']} />
          <SpiderMesh paramsRef={paramsRef} />
        </Canvas>
      </div>
    </>
  )
}

export default App
