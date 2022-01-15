import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'

import { context } from './setup'
import { useUpdateWorldPropsEffect } from './useUpdateWorldPropsEffect'

import type { ContactMaterial, Shape } from 'cannon-es'
import type { PropsWithChildren } from 'react'
import type { Object3D } from 'three'

import type { AtomicName, Buffers, PropValue, ProviderContext, Refs } from './setup'
import type { Triplet } from './hooks'

// @ts-expect-error Types are not setup for this yet
import CannonWorker from '../src/worker'

function noop() {
  /**/
}

export type Broadphase = 'Naive' | 'SAP'
export type Solver = 'GS' | 'Split'

export type DefaultContactMaterial = Partial<
  Pick<
    ContactMaterial,
    | 'contactEquationRelaxation'
    | 'contactEquationStiffness'
    | 'friction'
    | 'frictionEquationRelaxation'
    | 'frictionEquationStiffness'
    | 'restitution'
  >
>

export type ProviderProps = PropsWithChildren<{
  allowSleep?: boolean
  axisIndex?: number
  broadphase?: Broadphase
  defaultContactMaterial?: DefaultContactMaterial
  gravity?: Triplet
  iterations?: number
  quatNormalizeFast?: boolean
  quatNormalizeSkip?: number
  shouldInvalidate?: boolean
  size?: number
  solver?: Solver
  step?: number
  tolerance?: number
}>

type Observation = { [K in AtomicName]: [id: number, value: PropValue<K>, type: K] }[AtomicName]

type WorkerFrameMessage = {
  data: Buffers & {
    active: boolean
    bodies?: string[]
    observations: Observation[]
    op: 'frame'
  }
}

export type WorkerCollideEvent = {
  data: {
    op: 'event'
    type: 'collide'
    target: string
    body: string
    contact: {
      id: string
      ni: number[]
      ri: number[]
      rj: number[]
      impactVelocity: number
      bi: string
      bj: string
      /** Contact point in world space */
      contactPoint: number[]
      /** Normal of the contact, relative to the colliding body */
      contactNormal: number[]
    }
    collisionFilters: {
      bodyFilterGroup: number
      bodyFilterMask: number
      targetFilterGroup: number
      targetFilterMask: number
    }
  }
}

export type WorkerRayhitEvent = {
  data: {
    op: 'event'
    type: 'rayhit'
    ray: {
      from: number[]
      to: number[]
      direction: number[]
      collisionFilterGroup: number
      collisionFilterMask: number
      uuid: string
    }
    hasHit: boolean
    body: string | null
    shape: (Omit<Shape, 'body'> & { body: string }) | null
    rayFromWorld: number[]
    rayToWorld: number[]
    hitNormalWorld: number[]
    hitPointWorld: number[]
    hitFaceIndex: number
    distance: number
    shouldStop: boolean
  }
}
export type WorkerCollideBeginEvent = {
  data: {
    op: 'event'
    type: 'collideBegin'
    bodyA: string
    bodyB: string
  }
}
export type WorkerCollideEndEvent = {
  data: {
    op: 'event'
    type: 'collideEnd'
    bodyA: string
    bodyB: string
  }
}
type WorkerEventMessage =
  | WorkerCollideEvent
  | WorkerRayhitEvent
  | WorkerCollideBeginEvent
  | WorkerCollideEndEvent
type IncomingWorkerMessage = WorkerFrameMessage | WorkerEventMessage

const v = new Vector3()
const s = new Vector3(1, 1, 1)
const q = new Quaternion()
const m = new Matrix4()

function apply(index: number, buffers: Buffers, object?: Object3D) {
  if (index !== undefined) {
    m.compose(
      v.fromArray(buffers.positions, index * 3),
      q.fromArray(buffers.quaternions, index * 4),
      object ? object.scale : s,
    )
    if (object) {
      object.matrixAutoUpdate = false
      object.matrix.copy(m)
    }
    return m
  }
  return m.identity()
}

export function Provider({
  allowSleep = false,
  axisIndex = 0,
  broadphase = 'Naive',
  children,
  defaultContactMaterial = { contactEquationStiffness: 1e6 },
  gravity = [0, -9.81, 0],
  iterations = 5,
  quatNormalizeFast = false,
  quatNormalizeSkip = 0,
  shouldInvalidate = true,
  size = 1000,
  solver = 'GS',
  step = 1 / 60,
  tolerance = 0.001,
}: ProviderProps): JSX.Element {
  const { invalidate } = useThree()
  const [worker] = useState<Worker>(() => new CannonWorker() as Worker)
  const [refs] = useState<Refs>({})
  const [buffers] = useState<Buffers>(() => ({
    positions: new Float32Array(size * 3),
    quaternions: new Float32Array(size * 4),
  }))
  const [events] = useState<ProviderContext['events']>({})
  const [subscriptions] = useState<ProviderContext['subscriptions']>({})

  const bodies = useRef<{ [uuid: string]: number }>({})
  const loop = useCallback(() => {
    if (buffers.positions.byteLength !== 0 && buffers.quaternions.byteLength !== 0) {
      worker.postMessage({ op: 'step', ...buffers }, [buffers.positions.buffer, buffers.quaternions.buffer])
    }
  }, [])

  // Run loop *after* all the physics objects have ran theirs!
  // Otherwise the buffers will be invalidated by the browser
  useFrame(loop)

  useLayoutEffect(() => {
    worker.postMessage({
      op: 'init',
      props: {
        allowSleep,
        axisIndex,
        broadphase,
        defaultContactMaterial,
        gravity,
        iterations,
        quatNormalizeFast,
        quatNormalizeSkip,
        solver,
        step,
        tolerance,
      },
    })

    let i = 0
    let body: string
    let callback
    worker.onmessage = (e: IncomingWorkerMessage) => {
      switch (e.data.op) {
        case 'frame':
          buffers.positions = e.data.positions
          buffers.quaternions = e.data.quaternions
          if (e.data.bodies) {
            for (i = 0; i < e.data.bodies.length; i++) {
              body = e.data.bodies[i]
              bodies.current[body] = e.data.bodies.indexOf(body)
            }
          }

          e.data.observations.forEach(([id, value, type]) => {
            const subscription = subscriptions[id] || {}
            callback = subscription[type] || noop
            // HELP: We clearly know the type of the callback, but typescript can't deal with it
            callback(value as never)
          })

          if (e.data.active) {
            for (const ref of Object.values(refs)) {
              if (ref instanceof InstancedMesh) {
                for (let i = 0; i < ref.count; i++) {
                  const index = bodies.current[`${ref.uuid}/${i}`]
                  if (index !== undefined) {
                    ref.setMatrixAt(i, apply(index, buffers))
                  }
                  ref.instanceMatrix.needsUpdate = true
                }
              } else {
                apply(bodies.current[ref.uuid], buffers, ref)
              }
            }
            if (shouldInvalidate) {
              invalidate()
            }
          }

          break
        case 'event':
          switch (e.data.type) {
            case 'collide':
              callback = events[e.data.target]?.collide || noop
              callback({
                ...e.data,
                body: refs[e.data.body],
                contact: {
                  ...e.data.contact,
                  bi: refs[e.data.contact.bi],
                  bj: refs[e.data.contact.bj],
                },
                target: refs[e.data.target],
              })
              break
            case 'collideBegin':
              callback = events[e.data.bodyA]?.collideBegin || noop
              callback({
                body: refs[e.data.bodyB],
                op: 'event',
                target: refs[e.data.bodyA],
                type: 'collideBegin',
              })
              callback = events[e.data.bodyB]?.collideBegin || noop
              callback({
                body: refs[e.data.bodyA],
                op: 'event',
                target: refs[e.data.bodyB],
                type: 'collideBegin',
              })
              break
            case 'collideEnd':
              callback = events[e.data.bodyA]?.collideEnd || noop
              callback({
                body: refs[e.data.bodyB],
                op: 'event',
                target: refs[e.data.bodyA],
                type: 'collideEnd',
              })
              callback = events[e.data.bodyB]?.collideEnd || noop
              callback({
                body: refs[e.data.bodyA],
                op: 'event',
                target: refs[e.data.bodyB],
                type: 'collideEnd',
              })
              break
            case 'rayhit':
              callback = events[e.data.ray.uuid]?.rayhit || noop
              callback({
                ...e.data,
                body: e.data.body ? refs[e.data.body] : null,
              })
              break
          }
          break
      }
    }
    return () => worker.terminate()
  }, [])

  useUpdateWorldPropsEffect({ axisIndex, broadphase, gravity, iterations, step, tolerance, worker })

  const api: ProviderContext = useMemo(
    () => ({ bodies, buffers, events, refs, subscriptions, worker }),
    [bodies, buffers, events, refs, subscriptions, worker],
  )
  return <context.Provider value={api}>{children}</context.Provider>
}
