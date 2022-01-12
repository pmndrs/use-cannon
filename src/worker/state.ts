import { World } from 'cannon-es'

const world = new World()

export const state = {
  bodies: {},
  vehicles: {},
  springs: {},
  springInstances: {},
  constraints: {},
  rays: {},
  materials: {},
  world,
  config: { step: 1 / 60 },
  subscriptions: {},
  bodiesNeedSyncing: false,
  lastCallTime: undefined,
}
