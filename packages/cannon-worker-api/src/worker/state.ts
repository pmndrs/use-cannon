import type { Body, Constraint, ContactMaterial, Material, RaycastVehicle, Spring } from 'cannon-es'
import { World } from 'cannon-es'

import type { SubscriptionName, SubscriptionTarget } from '../types'
import type { WithUUID } from './types'

export interface DecoratedWorld extends World {
  bodies: WithUUID<Body>[]
  constraints: WithUUID<Constraint>[]
  contactmaterials: WithUUID<ContactMaterial>[]
}

export interface State {
  bodies: { [uuid: string]: Body }
  bodiesNeedSyncing: boolean
  constraints: { [uuid: string]: () => void }
  materials: { [uuid: string]: Material }
  rays: { [uuid: string]: () => void }
  springInstances: { [uuid: string]: Spring }
  springs: { [uuid: string]: () => void }
  subscriptions: { [id: string]: [uuid: string, type: SubscriptionName, target: SubscriptionTarget] }
  vehicles: { [uuid: string]: { postStep: () => void; preStep: () => void; vehicle: RaycastVehicle } }
  world: DecoratedWorld
}

export const state: State = {
  bodies: {},
  bodiesNeedSyncing: false,
  constraints: {},
  materials: {},
  rays: {},
  springInstances: {},
  springs: {},
  subscriptions: {},
  vehicles: {},
  world: new World(),
}
