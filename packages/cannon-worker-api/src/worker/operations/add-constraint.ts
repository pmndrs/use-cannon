import {
  ConeTwistConstraint,
  Constraint,
  DistanceConstraint,
  HingeConstraint,
  LockConstraint,
  PointToPointConstraint,
} from 'cannon-es'

import type { CannonMessageMap } from '../../types'
import type { State } from '../state'
import { tripletToVec3 } from '../triplet-to-vec3'
import type { WithUUID } from '../types'

export const addConstraint = (
  state: State,
  {
    props: [
      bodyA,
      bodyB,
      {
        angle,
        axisA,
        axisB,
        collideConnected,
        distance,
        maxForce,
        maxMultiplier,
        pivotA,
        pivotB,
        twistAngle,
        wakeUpBodies,
      },
    ],
    type,
    uuid,
  }: CannonMessageMap['addConstraint'],
) => {
  let constraint: WithUUID<Constraint>

  switch (type) {
    case 'PointToPoint':
      constraint = new PointToPointConstraint(
        state.bodies[bodyA],
        tripletToVec3(pivotA),
        state.bodies[bodyB],
        tripletToVec3(pivotB),
        maxForce,
      )
      break
    case 'ConeTwist':
      constraint = new ConeTwistConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        angle,
        axisA: tripletToVec3(axisA),
        axisB: tripletToVec3(axisB),
        collideConnected,
        maxForce,
        pivotA: tripletToVec3(pivotA),
        pivotB: tripletToVec3(pivotB),
        twistAngle,
      })
      break
    case 'Hinge':
      constraint = new HingeConstraint(state.bodies[bodyA], state.bodies[bodyB], {
        axisA: tripletToVec3(axisA),
        axisB: tripletToVec3(axisB),
        collideConnected,
        maxForce,
        pivotA: tripletToVec3(pivotA),
        pivotB: tripletToVec3(pivotB),
      })
      break
    case 'Distance':
      constraint = new DistanceConstraint(state.bodies[bodyA], state.bodies[bodyB], distance, maxForce)
      break
    case 'Lock':
      constraint = new LockConstraint(state.bodies[bodyA], state.bodies[bodyB], { maxForce })
      break
    default:
      constraint = new Constraint(state.bodies[bodyA], state.bodies[bodyB], {
        collideConnected,
        wakeUpBodies,
      })
      break
  }
  constraint.uuid = uuid
  state.world.addConstraint(constraint)

  if (maxMultiplier !== undefined) {
    const postStepConstraint = () => {
      // The multiplier is proportional to how much force is added to the bodies by the constraint.
      // If this exceeds a limit the constraint is disabled.
      const multiplier = Math.abs(constraint.equations[0].multiplier)
      if (multiplier > maxMultiplier) {
        constraint.disable()
      }
    }
    state.constraints[uuid] = postStepConstraint
    state.world.addEventListener('postStep', state.constraints[uuid])
  }
}
