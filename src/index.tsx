import * as THREE from 'three'
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react'
import { useFrame } from 'react-three-fiber'
import CannonWorker from './worker'

type Bodies = {
  [uuid: string]: number
}

type PhysicsProps = {
  children: React.ReactNode
  gravity: number[]
  tolerance: number
}

type PhysicsContext = {
  worker: Worker | undefined
  setRef: React.Dispatch<React.SetStateAction<Refs>>
}

type WorkerEvent = {
  data: {
    op: string
    positions: Float32Array
    quaternions: Float32Array
    bodies: number[]
  }
}

type Refs = {
  [uuid: string]: THREE.Object3D
}

type ShapeProps = {
  position?: number[]
  rotation?: number[]
  mass: number
}

type BodyProps = ShapeProps & {
  type: string
}

type PlaneProps = ShapeProps & {}

type BoxProps = ShapeProps & {
  halfExtents: number[]
}

const bodies = React.createRef() as React.MutableRefObject<Bodies>
const context = React.createContext<PhysicsContext>({} as PhysicsContext)

export function Physics({ children, gravity = [0, -10, 0], tolerance = 0.001 }: PhysicsProps): React.ReactNode {
  const [worker, setWorker] = useState<Worker>()
  const [refs, setRef] = useState<Refs>({})
  const count = useMemo(() => Object.keys(refs).length, [refs])

  useEffect(() => {
    if (count) {
      let positions = new Float32Array(count * 3)
      let quaternions = new Float32Array(count * 4)

      // Initialize worker
      let currentWorker = new CannonWorker() as Worker
      currentWorker.postMessage({ op: 'init', gravity, tolerance })

      function loop() {
        if (positions.byteLength !== 0 && quaternions.byteLength !== 0) {
          currentWorker.postMessage({ op: 'step', positions, quaternions }, [positions.buffer, quaternions.buffer])
        }
      }

      currentWorker.onmessage = (e: WorkerEvent) => {
        switch (e.data.op) {
          case 'frame': {
            positions = e.data.positions
            quaternions = e.data.quaternions

            /*if (positions.length) {
              ref.current.position.fromArray(buffers.current.positions, index * 3)
              ref.current.quaternion.fromArray(buffers.current.quaternions, index * 4)
            }*/

            requestAnimationFrame(loop)
            break
          }
          case 'sync': {
            bodies.current = e.data.bodies.reduce((acc, id) => ({ ...acc, [id]: e.data.bodies.indexOf(id) }), {})
            break
          }
          default:
            break
        }
      }
      loop()
      setWorker(currentWorker)
      return () => currentWorker.terminate()
    }
  }, [count])

  const api = useMemo(() => ({ worker, setRef }), [worker])
  return <context.Provider value={api}>{children}</context.Provider>
}

export function useBody(props: BodyProps, deps: any[] = []) {
  const ref = useRef<THREE.Object3D>()
  const { worker, setRef } = useContext(context)

  useEffect(() => {
    if (ref.current && worker) {
      const object = ref.current
      const uuid = ref.current.uuid
      const currentWorker = worker

      // Add body
      currentWorker.postMessage({ op: 'addBody', uuid, ...props })
      // Add ref to the collection
      setRef(refs => ({ ...refs, [uuid]: object }))

      return () => {
        // Remove body from worker
        currentWorker.postMessage({ op: 'removeBody', uuid })
        // Remove ref from collection
        setRef(refs => {
          const temp = { ...refs }
          delete temp[uuid]
          return temp
        })
      }
    }
  }, [ref.current, worker, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  const api = useMemo(() => {
    if (worker)
      return {
        setPosition(position: number[]) {
          if (ref.current) worker.postMessage({ op: 'setPosition', uuid: ref.current.uuid, position })
        },
      }
  }, [worker])
  return [ref, api]
}

export function usePlane(props: PlaneProps, deps: any[] = []) {
  return useBody({ type: 'Plane', ...props })
}

export function useBox(props: BoxProps, deps: any[] = []) {
  return useBody({ type: 'Box', ...props })
}
