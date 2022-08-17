import type { Body } from 'cannon-es'
import { GSSolver, NaiveBroadphase, SAPBroadphase, SplitSolver, Vec3 } from 'cannon-es'

import type { CannonMessageProps } from '../../types'
import type { DecoratedWorld } from '../state'
import type { CannonWorkerGlobalScope, WithUUID } from '../types'

declare const self: CannonWorkerGlobalScope

type TwoBodies = {
  bodyA?: WithUUID<Body>
  bodyB?: WithUUID<Body>
}

function emitBeginContact({ bodyA, bodyB }: TwoBodies) {
  if (!bodyA?.uuid || !bodyB?.uuid) return
  self.postMessage({ bodyA: bodyA.uuid, bodyB: bodyB.uuid, op: 'event', type: 'collideBegin' })
}

function emitEndContact({ bodyA, bodyB }: TwoBodies) {
  if (!bodyA?.uuid || !bodyB?.uuid) return
  self.postMessage({ bodyA: bodyA.uuid, bodyB: bodyB.uuid, op: 'event', type: 'collideEnd' })
}

export const init = (
  world: DecoratedWorld,
  {
    allowSleep,
    axisIndex = 0,
    broadphase,
    defaultContactMaterial,
    frictionGravity,
    gravity,
    iterations,
    quatNormalizeFast,
    quatNormalizeSkip,
    solver,
    tolerance,
  }: CannonMessageProps<'init'>,
): void => {
  world.allowSleep = allowSleep
  world.gravity.set(...gravity)
  world.frictionGravity = frictionGravity ? new Vec3(...frictionGravity) : undefined
  world.quatNormalizeFast = quatNormalizeFast
  world.quatNormalizeSkip = quatNormalizeSkip

  if (solver === 'Split') {
    world.solver = new SplitSolver(new GSSolver())
  }

  if (world.solver instanceof GSSolver) {
    world.solver.tolerance = tolerance
    world.solver.iterations = iterations
  }

  world.broadphase = broadphase === 'SAP' ? new SAPBroadphase(world) : new NaiveBroadphase()

  if (world.broadphase instanceof SAPBroadphase) {
    world.broadphase.axisIndex = axisIndex
  }

  world.addEventListener('beginContact', emitBeginContact)
  world.addEventListener('endContact', emitEndContact)

  Object.assign(world.defaultContactMaterial, defaultContactMaterial)
}
