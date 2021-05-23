import type { Object3D } from 'three'
import type { WorkerCollideEvent, WorkerRayhitEvent } from './Provider'
import type { AtomicProps } from './hooks'
import React, { createContext } from 'react'
import type { Body as CannonBody } from 'cannon-es'

export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }
export type Event =
  | (Omit<WorkerRayhitEvent['data'], 'body'> & { body: Object3D | null })
  | (Omit<WorkerCollideEvent['data'], 'body' | 'target'> & { body: Object3D; target: Object3D })
export type Events = { [uuid: string]: (e: Event) => void }
export type DebugInfo = { bodies: CannonBody[]; refs: { [uuid: string]: CannonBody } } | null
export type Subscriptions = {
  [id: string]: (value: AtomicProps[keyof AtomicProps] | number[]) => void
}

export type ProviderContext = {
  worker: Worker
  bodies: React.MutableRefObject<{ [uuid: string]: number }>
  buffers: Buffers
  refs: Refs
  events: Events
  subscriptions: Subscriptions
  debugInfo: DebugInfo
}

export const context = createContext<ProviderContext>({} as ProviderContext)
