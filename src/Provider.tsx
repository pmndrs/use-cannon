import type { Shape } from 'cannon-es'
import type { Buffers, Refs, Events, Subscriptions, ProviderContext, DebugInfo } from './setup'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { context } from './setup'
// @ts-ignore
import CannonWorker from '../src/worker'
import CannonDebugRenderer from './CannonDebugRenderer'
import { useUpdateWorldPropsEffect } from './useUpdateWorldPropsEffect'

export type ProviderProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
  iterations?: number
  allowSleep?: boolean
  broadphase?: 'Naive' | 'SAP'
  axisIndex?: number
  defaultContactMaterial?: {
    friction?: number
    restitution?: number
    contactEquationStiffness?: number
    contactEquationRelaxation?: number
    frictionEquationStiffness?: number
    frictionEquationRelaxation?: number
  }
  size?: number
  debug?: boolean
}

type WorkerFrameMessage = {
  data: Buffers & {
    op: 'frame'
    observations: [string, any]
    active: boolean
    bodies?: string[]
  }
}
export type WorkerCollideEvent = {
  data: {
    op: 'event'
    type: 'collide'
    target: string
    body: string
    contact: {
      ni: number[]
      ri: number[]
      rj: number[]
      impactVelocity: number
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
type WorkerEventMessage = WorkerCollideEvent | WorkerRayhitEvent
type IncomingWorkerMessage = WorkerFrameMessage | WorkerEventMessage

export default function Provider({
  children,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
  allowSleep = false,
  broadphase = 'Naive',
  axisIndex = 0,
  defaultContactMaterial = {
    contactEquationStiffness: 1e6,
  },
  size = 1000,
  debug = false,
}: ProviderProps): JSX.Element {
  const { gl, invalidate } = useThree()
  const [worker] = useState<Worker>(() => new CannonWorker() as Worker)
  const [refs] = useState<Refs>({})
  const [buffers] = useState<Buffers>(() => ({
    positions: new Float32Array(size * 3),
    quaternions: new Float32Array(size * 4),
  }))
  const [events] = useState<Events>({})
  const [subscriptions] = useState<Subscriptions>({})
  const [debugInfo] = useState<DebugInfo>(debug ? { bodies: [], refs: {} } : null)
  const bodies = useRef<{ [uuid: string]: number }>({})
  const loop = useMemo(
    () => () => {
      if (buffers.positions.byteLength !== 0 && buffers.quaternions.byteLength !== 0) {
        worker.postMessage({ op: 'step', ...buffers }, [buffers.positions.buffer, buffers.quaternions.buffer])
      }
    },
    [],
  )

  const prevPresenting = useRef(false)
  useFrame(() => {
    loop()
    if (gl.xr?.enabled) {
      // https://github.com/pmndrs/use-cannon/issues/99#issuecomment-660495528
      // https://github.com/pmndrs/use-cannon/commit/576d7967935dbbfcd44b81347caab43487382702
      // https://github.com/pmndrs/use-cannon/commit/91e655c19733608216d340903353467c1f4e2d64
      if (gl.xr?.isPresenting && !prevPresenting.current) gl.xr?.getSession?.()?.requestAnimationFrame(loop)
      if (!gl.xr?.isPresenting && prevPresenting.current) requestAnimationFrame(loop)
      prevPresenting.current = gl.xr?.isPresenting
    }
  })

  useEffect(() => {
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
    let observation: [key: string, value: any]
    worker.onmessage = (e: IncomingWorkerMessage) => {
      switch (e.data.op) {
        case 'frame':
          if (e.data.bodies) {
            for (i = 0; i < e.data.bodies.length; i++) {
              body = e.data.bodies[i]
              bodies.current[body] = (e.data as any).bodies.indexOf(body)
            }
          }
          buffers.positions = e.data.positions
          buffers.quaternions = e.data.quaternions
          for (i = 0; i < e.data.observations.length; i++) {
            observation = e.data.observations[i]
            if (subscriptions[observation[0]]) subscriptions[observation[0]](observation[1])
          }
          if (e.data.active) invalidate()
          break
        case 'event':
          switch (e.data.type) {
            case 'collide':
              events[e.data.target]({
                ...e.data,
                target: refs[e.data.target],
                body: refs[e.data.body],
              })
              break
            case 'rayhit':
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

  const api = useMemo(
    () => ({ worker, bodies, refs, buffers, events, subscriptions, debugInfo }),
    [worker, bodies, refs, buffers, events, subscriptions, debugInfo],
  )
  return (
    <context.Provider value={api as ProviderContext}>
      {debug && <CannonDebugRenderer />}
      {children}
    </context.Provider>
  )
}
