import type { Body, ContactEquation } from 'cannon-es'

import type { IncomingWorkerMessage } from '../types'

export type WithUUID<C> = C & { uuid?: string }

export interface CannonWorkerGlobalScope extends ServiceWorkerGlobalScope {
  postMessage(message: IncomingWorkerMessage['data'], transfer: Transferable[]): void
  postMessage(message: IncomingWorkerMessage['data'], options?: StructuredSerializeOptions): void
}

export interface CannonCollideEvent {
  body: WithUUID<Body>
  contact: ContactEquation
  target: WithUUID<Body>
  type: 'collide'
}
