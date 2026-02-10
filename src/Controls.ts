import { Pane } from 'tweakpane'

export interface Params {
  gridSpacing: number
  neighborCount: number
  maxDistance: number
  pullStrength: number
  pullElasticity: number
  fadeInSpeed: number
  fadeOutSpeed: number
  hubSize: number
  particleMinSize: number
  particleMaxSize: number
  particleColor: string
}

const defaultParams: Params = {
  gridSpacing: 40,
  neighborCount: 18,
  maxDistance: 250,
  pullStrength: 0.22,
  pullElasticity: 0.15,
  fadeInSpeed: 0.25,
  fadeOutSpeed: 0.08,
  hubSize: 4,
  particleMinSize: 1.5,
  particleMaxSize: 6,
  particleColor: '#ff6b35',
}

type PaneWithFolder = Pane & {
  addFolder: (opts: { title: string }) => { addBinding: (...args: unknown[]) => unknown }
}

export function createControls(): { params: Params; pane: Pane } {
  const params = { ...defaultParams }
  const pane = new Pane({ title: 'Spider Mesh' }) as PaneWithFolder

  const grid = pane.addFolder({ title: 'Grid' })
  grid.addBinding(params, 'gridSpacing', { min: 20, max: 80, step: 2 })

  const spider = pane.addFolder({ title: 'Spider' })
  spider.addBinding(params, 'neighborCount', { min: 8, max: 32, step: 1 })
  spider.addBinding(params, 'maxDistance', { min: 100, max: 400, step: 10 })
  spider.addBinding(params, 'pullStrength', { min: 0.05, max: 0.45, step: 0.01 })
  spider.addBinding(params, 'pullElasticity', { min: 0, max: 0.4, step: 0.02 })
  spider.addBinding(params, 'hubSize', { min: 2, max: 12, step: 1 })

  const animation = pane.addFolder({ title: 'Animation' })
  animation.addBinding(params, 'fadeInSpeed', { min: 0.1, max: 0.5, step: 0.01 })
  animation.addBinding(params, 'fadeOutSpeed', { min: 0.02, max: 0.2, step: 0.01 })

  const appearance = pane.addFolder({ title: 'Appearance' })
  appearance.addBinding(params, 'particleMinSize', { min: 0.5, max: 3, step: 0.5 })
  appearance.addBinding(params, 'particleMaxSize', { min: 3, max: 12, step: 0.5 })
  appearance.addBinding(params, 'particleColor', { label: 'Color' })

  return { params, pane }
}
