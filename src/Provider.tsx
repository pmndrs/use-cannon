import React, { useState, useLayoutEffect, useRef, useMemo, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { InstancedMesh, Vector3, Quaternion, Matrix4 } from 'three'

import type { PropsWithChildren } from 'react'
import type { Object3D } from 'three'

import { context } from './hooks'
// @ts-expect-error Types are not setup for this yet
import CannonWorker from '../src/worker'
import { useUpdateWorldPropsEffect } from './useUpdateWorldPropsEffect'

import type {
  Buffers,
  CannonEvents,
  IncomingWorkerMessage,
  ProviderContext,
  Refs,
  Subscriptions,
} from './shared'

export type ProviderProps = PropsWithChildren<{
  allowSleep?: boolean
  axisIndex?: number
  broadphase?: 'Naive' | 'SAP'
  defaultContactMaterial?: {
    contactEquationRelaxation?: number
    contactEquationStiffness?: number
    frictionEquationRelaxation?: number
    frictionEquationStiffness?: number
    friction?: number
    restitution?: number
  }
  gravity?: number[]
  iterations?: number
  shouldInvalidate?: boolean
  size?: number
  step?: number
  tolerance?: number
}>

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

export default function Provider({
  children,
  shouldInvalidate = true,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
  allowSleep = false,
  broadphase = 'Naive',
  axisIndex = 0,
  defaultContactMaterial = { contactEquationStiffness: 1e6 },
  size = 1000,
}: ProviderProps): JSX.Element {
  const { invalidate } = useThree()
  const [worker] = useState<Worker>(() => new CannonWorker() as Worker)
  const [refs] = useState<Refs>({})
  const [buffers] = useState<Buffers>(() => ({
    positions: new Float32Array(size * 3),
    quaternions: new Float32Array(size * 4),
  }))
  const [events] = useState<CannonEvents>({})
  const [subscriptions] = useState<Subscriptions>({})

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
        gravity,
        tolerance,
        step,
        iterations,
        broadphase,
        allowSleep,
        axisIndex,
        defaultContactMaterial,
      },
    })

    let i = 0
    let body: string
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

          e.data.observations.forEach(([key, value]) => {
            if (subscriptions[key]) subscriptions[key](value)
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
              events[e.data.target]({
                ...e.data,
                target: refs[e.data.target],
                body: refs[e.data.body],
                contact: {
                  ...e.data.contact,
                  bi: refs[e.data.contact.bi],
                  bj: refs[e.data.contact.bj],
                },
              })
              break
            case 'collideBegin':
              if (events[e.data.bodyA]) {
                events[e.data.bodyA]({
                  op: 'event',
                  type: 'collideBegin',
                  target: refs[e.data.bodyA],
                  body: refs[e.data.bodyB],
                })
              }
              if (events[e.data.bodyB]) {
                events[e.data.bodyB]({
                  op: 'event',
                  type: 'collideBegin',
                  target: refs[e.data.bodyB],
                  body: refs[e.data.bodyA],
                })
              }
              break
            case 'collideEnd':
              if (events[e.data.bodyA]) {
                events[e.data.bodyA]({
                  op: 'event',
                  type: 'collideEnd',
                  target: refs[e.data.bodyA],
                  body: refs[e.data.bodyB],
                })
              }
              if (events[e.data.bodyB]) {
                events[e.data.bodyB]({
                  op: 'event',
                  type: 'collideEnd',
                  target: refs[e.data.bodyB],
                  body: refs[e.data.bodyA],
                })
              }
              break
            case 'rayhit':
              if (!events[e.data.ray.uuid]) break
              events[e.data.ray.uuid]({
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

  useUpdateWorldPropsEffect({ worker, axisIndex, broadphase, gravity, iterations, step, tolerance })

  const api: ProviderContext = useMemo(
    () => ({ worker, bodies, refs, buffers, events, subscriptions }),
    [worker, bodies, refs, buffers, events, subscriptions],
  )
  return <context.Provider value={api}>{children}</context.Provider>
}
