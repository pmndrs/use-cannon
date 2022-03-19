import type { Body, RayOptions } from 'cannon-es'
import { Ray, RAY_MODES, RaycastResult } from 'cannon-es'

import type { CannonMessageMap } from '../../types'
import type { State } from '../state'
import { tripletToVec3 } from '../triplet-to-vec3'
import type { CannonWorkerGlobalScope, WithUUID } from '../types'

declare const self: CannonWorkerGlobalScope

function toUppercase<T extends string>(str: T): Uppercase<T> {
  return str.toUpperCase() as Uppercase<T>
}

export const addRay = (
  state: State,
  { props: { from, mode, to, ...rayOptions }, uuid }: CannonMessageMap['addRay'],
) => {
  const ray = new Ray(tripletToVec3(from), tripletToVec3(to))

  const options: RayOptions = {
    mode: RAY_MODES[toUppercase(mode)],
    result: new RaycastResult(),
    ...rayOptions,
  }

  state.rays[uuid] = () => {
    ray.intersectWorld(state.world, options)

    if (!options.result || !options.result.body) return

    const { body, shape, rayFromWorld, rayToWorld, hitNormalWorld, hitPointWorld, ...rest } = options.result

    const bodyUUID = (body as WithUUID<Body>).uuid

    if (!bodyUUID) return

    self.postMessage({
      body: bodyUUID,
      hitNormalWorld: hitNormalWorld.toArray(),
      hitPointWorld: hitPointWorld.toArray(),
      op: 'event',
      ray: {
        collisionFilterGroup: ray.collisionFilterGroup,
        collisionFilterMask: ray.collisionFilterMask,
        direction: ray.direction.toArray(),
        from,
        to,
        uuid,
      },
      rayFromWorld: rayFromWorld.toArray(),
      rayToWorld: rayToWorld.toArray(),
      shape: shape ? { ...shape, body: bodyUUID } : null,
      type: 'rayhit',
      ...rest,
    })
  }

  state.world.addEventListener('preStep', state.rays[uuid])
}
