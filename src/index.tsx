import React, { Suspense, createContext, lazy } from 'react'
import { ProviderProps } from './Provider'
export * from './hooks'

export type Refs = { [uuid: string]: THREE.Object3D }
export type Event = {
  op: string
  type: string
  body: THREE.Object3D
  target: THREE.Object3D
  contact: {
    ni: number[]
    ri: number[]
    rj: number[]
    impactVelocity: number
  }
}
export type Events = { [uuid: string]: (e: Event) => void }

export type ProviderContext = {
  worker: Worker
  bodies: React.MutableRefObject<{ [uuid: string]: number }>
  buffers: { positions: Float32Array; quaternions: Float32Array }
  refs: Refs
  events: Events
}

const context = createContext<ProviderContext>({} as ProviderContext)
const Provider = typeof window === 'undefined' ? () => null : lazy(() => import('./Provider'))

function Physics(props: ProviderProps) {
  return (
    <Suspense fallback={null}>
      <Provider {...props} />
    </Suspense>
  )
}

export { Physics, context }
