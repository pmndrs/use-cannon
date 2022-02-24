import type { Body } from 'cannon-es'
import { GSSolver, NaiveBroadphase, SAPBroadphase, SplitSolver } from 'cannon-es'

import type { CannonMessageProps } from '../../setup'
import type { State } from '../state'
import type { WithUUID } from '../types'

type TwoBodies = {
  bodyA?: WithUUID<Body>
  bodyB?: WithUUID<Body>
}

function emitBeginContact({ bodyA, bodyB }: TwoBodies) {
  if (!bodyA || !bodyB) return
  self.postMessage({ bodyA: bodyA.uuid, bodyB: bodyB.uuid, op: 'event', type: 'collideBegin' })
}

function emitEndContact({ bodyA, bodyB }: TwoBodies) {
  if (!bodyA || !bodyB) return
  self.postMessage({ bodyA: bodyA.uuid, bodyB: bodyB.uuid, op: 'event', type: 'collideEnd' })
}

export const init = (
  state: State,
  {
    allowSleep,
    axisIndex = 0,
    broadphase,
    defaultContactMaterial,
    gravity,
    iterations,
    quatNormalizeFast,
    quatNormalizeSkip,
    solver,
    tolerance,
  }: CannonMessageProps<'init'>,
) => {
  state.world.allowSleep = allowSleep
  state.world.gravity.set(gravity[0], gravity[1], gravity[2])
  state.world.quatNormalizeFast = quatNormalizeFast
  state.world.quatNormalizeSkip = quatNormalizeSkip

  if (solver === 'Split') {
    state.world.solver = new SplitSolver(new GSSolver())
  }

  if (state.world.solver instanceof GSSolver) {
    state.world.solver.tolerance = tolerance
    state.world.solver.iterations = iterations
  }

  state.world.broadphase = broadphase === 'SAP' ? new SAPBroadphase(state.world) : new NaiveBroadphase()

  if (state.world.broadphase instanceof SAPBroadphase) {
    state.world.broadphase.axisIndex = axisIndex
  }

  state.world.addEventListener('beginContact', emitBeginContact)
  state.world.addEventListener('endContact', emitEndContact)

  Object.assign(state.world.defaultContactMaterial, defaultContactMaterial)
}
