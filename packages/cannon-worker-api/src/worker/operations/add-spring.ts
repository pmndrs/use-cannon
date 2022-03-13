import { Spring } from 'cannon-es'

import type { CannonMessageMap } from '../../types'
import type { State } from '../state'
import { tripletToVec3 } from '../triplet-to-vec3'
import type { WithUUID } from '../types'

export const addSpring = (
  state: State,
  {
    props: [
      bodyA,
      bodyB,
      { damping, localAnchorA, localAnchorB, restLength, stiffness, worldAnchorA, worldAnchorB },
    ],
    uuid,
  }: CannonMessageMap['addSpring'],
) => {
  const spring: WithUUID<Spring> = new Spring(state.bodies[bodyA], state.bodies[bodyB], {
    damping,
    localAnchorA: tripletToVec3(localAnchorA),
    localAnchorB: tripletToVec3(localAnchorB),
    restLength,
    stiffness,
    worldAnchorA: tripletToVec3(worldAnchorA),
    worldAnchorB: tripletToVec3(worldAnchorB),
  })

  spring.uuid = uuid

  const postStepSpring = () => spring.applyForce()

  state.springs[uuid] = postStepSpring
  state.springInstances[uuid] = spring

  // Compute the force after each step
  state.world.addEventListener('postStep', state.springs[uuid])
}
