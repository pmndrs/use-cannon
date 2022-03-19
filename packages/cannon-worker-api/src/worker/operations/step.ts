import { Quaternion, Vec3 } from 'cannon-es'

import type { CannonMessageMap, Observation, PropValue, WorkerFrameMessage } from '../../types'
import type { State } from '../state'
import type { CannonWorkerGlobalScope } from '../types'

declare const self: CannonWorkerGlobalScope

const isQorV = (v: unknown): v is Quaternion | Vec3 => v instanceof Quaternion || v instanceof Vec3

export const step = (
  state: State,
  { positions, props: { maxSubSteps, stepSize, timeSinceLastCalled }, quaternions }: CannonMessageMap['step'],
) => {
  state.world.step(stepSize, timeSinceLastCalled, maxSubSteps)

  for (let i = 0; i < state.world.bodies.length; i += 1) {
    const p = state.world.bodies[i].position
    const q = state.world.bodies[i].quaternion

    positions[3 * i + 0] = p.x
    positions[3 * i + 1] = p.y
    positions[3 * i + 2] = p.z

    quaternions[4 * i + 0] = q.x
    quaternions[4 * i + 1] = q.y
    quaternions[4 * i + 2] = q.z
    quaternions[4 * i + 3] = q.w
  }

  const observations: Observation[] = []

  for (const id of Object.keys(state.subscriptions)) {
    const [uuid, type, target = 'bodies'] = state.subscriptions[id]

    const { bodies, vehicles } = state

    const value =
      target === 'vehicles'
        ? // @ts-expect-error TODO: Differentiate these "types"
          vehicles[uuid].vehicle[type]
        : // @ts-expect-error TODO: Differentiate these "types"
          bodies[uuid][type]

    const serializableValue: PropValue<typeof type> = isQorV(value) ? value.toArray() : value

    observations.push([
      Number(id),
      serializableValue,
      // @ts-expect-error TODO: Differentiate these "types"
      type,
    ])
  }

  const message: WorkerFrameMessage['data'] = {
    active: state.world.hasActiveBodies,
    observations,
    op: 'frame',
    positions,
    quaternions,
  }

  if (state.bodiesNeedSyncing) {
    message.bodies = state.world.bodies.reduce((bodies: string[], body) => {
      if (body.uuid) bodies.push(body.uuid)
      return bodies
    }, [])
    state.bodiesNeedSyncing = false
  }

  self.postMessage(message, [positions.buffer, quaternions.buffer])
}
