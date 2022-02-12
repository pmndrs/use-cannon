import { World } from 'cannon-es'

const world = new World()

export const state = {
  bodies: {},
  bodiesNeedSyncing: false,
  constraints: {},
  materials: {},
  rays: {},
  springInstances: {},
  springs: {},
  subscriptions: {},
  vehicles: {},
  world,
}
