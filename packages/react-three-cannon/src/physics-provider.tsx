import type {
  CannonWorkerProps,
  WorkerCollideBeginEvent,
  WorkerCollideEndEvent,
  WorkerCollideEvent,
  WorkerFrameMessage,
  WorkerRayhitEvent,
} from '@pmndrs/cannon-worker-api'
import { CannonWorkerAPI } from '@pmndrs/cannon-worker-api'
import type { RenderCallback } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Object3D } from 'three'
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'

import type { PhysicsContext } from './physics-context'
import { physicsContext } from './physics-context'

export type PhysicsProviderProps = CannonWorkerProps & {
  isPaused?: boolean
  maxSubSteps?: number
  shouldInvalidate?: boolean
  stepSize?: number
}

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
const m = new Matrix4()

function apply(
  index: number,
  positions: Float32Array,
  quaternions: Float32Array,
  scale = s,
  object?: Object3D,
) {
  if (index !== undefined) {
    m.compose(v.fromArray(positions, index * 3), q.fromArray(quaternions, index * 4), scale)
    if (object) {
      object.matrixAutoUpdate = false
      object.matrix.copy(m)
    }
    return m
  }
  return m.identity()
}

const unique = () => {
  const values: unknown[] = []
  return (value: unknown) => (values.includes(value) ? false : !!values.push(value))
}

export function PhysicsProvider({
  allowSleep = false,
  axisIndex = 0,
  broadphase = 'Naive',
  children,
  defaultContactMaterial = { contactEquationStiffness: 1e6 },
  frictionGravity = null,
  gravity = [0, -9.81, 0],
  isPaused = false,
  iterations = 5,
  maxSubSteps = 10,
  quatNormalizeFast = false,
  quatNormalizeSkip = 0,
  shouldInvalidate = true,
  size = 1000,
  solver = 'GS',
  stepSize = 1 / 60,
  tolerance = 0.001,
}: PropsWithChildren<PhysicsProviderProps>): JSX.Element {
  const { invalidate } = useThree()

  const [{ bodies, events, refs, scaleOverrides, subscriptions, worker }] = useState<PhysicsContext>(() => ({
    bodies: {},
    events: {},
    refs: {},
    scaleOverrides: {},
    subscriptions: {},
    worker: new CannonWorkerAPI({
      allowSleep,
      axisIndex,
      broadphase,
      defaultContactMaterial,
      frictionGravity,
      gravity,
      iterations,
      quatNormalizeFast,
      quatNormalizeSkip,
      size,
      solver,
      tolerance,
    }),
  }))

  let timeSinceLastCalled = 0

  const loop = useCallback<RenderCallback>(
    (_, delta) => {
      if (isPaused) return
      timeSinceLastCalled += delta
      worker.step({ maxSubSteps, stepSize, timeSinceLastCalled })
      timeSinceLastCalled = 0
    },
    [isPaused, maxSubSteps, stepSize],
  )

  const collideHandler = ({
    body,
    contact: { bi, bj, ...contactRest },
    target,
    ...rest
  }: WorkerCollideEvent['data']) => {
    const cb = events[target]?.collide
    cb &&
      cb({
        body: refs[body],
        contact: {
          bi: refs[bi],
          bj: refs[bj],
          ...contactRest,
        },
        target: refs[target],
        ...rest,
      })
  }

  const collideBeginHandler = ({ bodyA, bodyB }: WorkerCollideBeginEvent['data']) => {
    const cbA = events[bodyA]?.collideBegin
    cbA &&
      cbA({
        body: refs[bodyB],
        op: 'event',
        target: refs[bodyA],
        type: 'collideBegin',
      })
    const cbB = events[bodyB]?.collideBegin
    cbB &&
      cbB({
        body: refs[bodyA],
        op: 'event',
        target: refs[bodyB],
        type: 'collideBegin',
      })
  }

  const collideEndHandler = ({ bodyA, bodyB }: WorkerCollideEndEvent['data']) => {
    const cbA = events[bodyA]?.collideEnd
    cbA &&
      cbA({
        body: refs[bodyB],
        op: 'event',
        target: refs[bodyA],
        type: 'collideEnd',
      })
    const cbB = events[bodyB]?.collideEnd
    cbB &&
      cbB({
        body: refs[bodyA],
        op: 'event',
        target: refs[bodyB],
        type: 'collideEnd',
      })
  }

  const frameHandler = ({
    active,
    bodies: uuids = [],
    observations,
    positions,
    quaternions,
  }: WorkerFrameMessage['data']) => {
    for (let i = 0; i < uuids.length; i++) {
      bodies[uuids[i]] = i
    }
    observations.forEach(([id, value, type]) => {
      const subscription = subscriptions[id] || {}
      const cb = subscription[type]
      // HELP: We clearly know the type of the callback, but typescript can't deal with it
      cb && cb(value as never)
    })

    if (!active) return

    for (const ref of Object.values(refs).filter(unique())) {
      if (ref instanceof InstancedMesh) {
        for (let i = 0; i < ref.count; i++) {
          const uuid = `${ref.uuid}/${i}`
          const index = bodies[uuid]
          if (index !== undefined) {
            ref.setMatrixAt(i, apply(index, positions, quaternions, scaleOverrides[uuid]))
            ref.instanceMatrix.needsUpdate = true
          }
        }
      } else {
        const scale = scaleOverrides[ref.uuid] || ref.scale
        apply(bodies[ref.uuid], positions, quaternions, scale, ref)
      }
    }

    if (shouldInvalidate) {
      invalidate()
    }
  }

  const rayhitHandler = ({ body, ray: { uuid, ...rayRest }, ...rest }: WorkerRayhitEvent['data']) => {
    const cb = events[uuid]?.rayhit
    cb &&
      cb({
        body: body ? refs[body] : null,
        ray: { uuid, ...rayRest },
        ...rest,
      })
  }

  // Run loop *after* all the physics objects have ran theirs!
  // Otherwise the buffers will be invalidated by the browser
  useFrame(loop)

  useEffect(() => {
    worker.connect()
    worker.init()

    worker.on('collide', collideHandler)
    worker.on('collideBegin', collideBeginHandler)
    worker.on('collideEnd', collideEndHandler)
    worker.on('frame', frameHandler)
    worker.on('rayhit', rayhitHandler)

    return () => {
      worker.terminate()
      worker.removeAllListeners()
    }
  }, [])

  useEffect(() => {
    worker.axisIndex = axisIndex
  }, [axisIndex])
  useEffect(() => {
    worker.broadphase = broadphase
  }, [broadphase])
  useEffect(() => {
    worker.gravity = gravity
  }, [gravity])
  useEffect(() => {
    worker.iterations = iterations
  }, [iterations])
  useEffect(() => {
    worker.tolerance = tolerance
  }, [tolerance])

  const value = useMemo<PhysicsContext>(
    () => ({ bodies, events, refs, scaleOverrides, subscriptions, worker }),
    [bodies, events, refs, subscriptions, worker],
  )

  return <physicsContext.Provider value={value}>{children}</physicsContext.Provider>
}
