import * as THREE from 'three'
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react'
import { useFrame } from 'react-three-fiber'
// @ts-ignore
import CannonWorker from '../src/worker'

type PhysicsProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
  iterations?: number
}

type PhysicsContext = {
  worker: Worker | undefined
  bodies: React.MutableRefObject<{ [uuid: string]: number }>
  setRef: React.Dispatch<React.SetStateAction<Refs>>
}

type WorkerEvent = {
  data: {
    op: string
    positions: Float32Array
    quaternions: Float32Array
    bodies: string[]
  }
}

type Refs = {
  [uuid: string]: THREE.Object3D
}

type BodyProps = {
  args?: any
  position?: number[]
  rotation?: number[]
  scale?: number[]
  mass?: number
  velocity?: number[]
  linearDamping?: number
  angularDamping?: number
  allowSleep?: boolean
  sleepSpeedLimit?: number
  sleepTimeLimit?: number
  collisionFilterGroup?: number
  collisionFilterMask?: number
  fixedRotation?: boolean
  isKinematic?: boolean
}

type ShapeType = 'Plane' | 'Box' | 'Cylinder' | 'Heightfield' | 'Particle' | 'Sphere' | 'Trimesh'

type PlaneProps = BodyProps & {}
type BoxProps = BodyProps & { args?: number[] }
type CylinderProps = BodyProps & { args?: [number, number, number, number] }
type ParticleProps = BodyProps & {}
type SphereProps = BodyProps & { args?: number }
type TrimeshProps = BodyProps & { args?: [number[], number[]] }
type HeightfieldProps = BodyProps & {
  args?: [number[], { minValue?: number; maxValue?: number; elementSize?: number }]
}

type BodyFn = (index?: number) => BodyProps
type PlaneFn = (index?: number) => PlaneProps
type BoxFn = (index?: number) => BoxProps
type CylinderFn = (index?: number) => CylinderProps
type HeightfieldFn = (index?: number) => HeightfieldProps
type ParticleFn = (index?: number) => ParticleProps
type SphereFn = (index?: number) => SphereProps
type TrimeshFn = (index?: number) => TrimeshProps

type ArgFn = (props: any) => any[]

type Api = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  (
    | {
        setPosition: (x: number, y: number, z: number) => void
        setRotation: (x: number, y: number, z: number) => void
        setPositionAt: (index: number, x: number, y: number, z: number) => void
        setRotationAt: (index: number, x: number, y: number, z: number) => void
      }
    | undefined
  )
]

const context = React.createContext<PhysicsContext>({} as PhysicsContext)
const buffers = React.createRef() as any
const temp = new THREE.Object3D()

export function Physics({
  children,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
}: PhysicsProps): React.ReactNode {
  const [worker] = useState<Worker>(() => new CannonWorker() as Worker)
  const [refs, setRef] = useState<Refs>({})
  const bodies = useRef<{ [uuid: string]: number }>({})
  const count = useMemo(() => Object.keys(refs).length, [refs])

  useEffect(() => {
    if (count) {
      let positions = new Float32Array(count * 3)
      let quaternions = new Float32Array(count * 4)

      // Initialize worker
      worker.postMessage({ op: 'init', props: { gravity, tolerance, step, iterations } })

      function loop() {
        if (positions.byteLength !== 0 && quaternions.byteLength !== 0) {
          worker.postMessage({ op: 'step', positions, quaternions }, [positions.buffer, quaternions.buffer])
        }
      }

      worker.onmessage = (e: WorkerEvent) => {
        switch (e.data.op) {
          case 'frame': {
            positions = e.data.positions
            quaternions = e.data.quaternions
            buffers.current = { positions, quaternions }
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
    }
  }, [count, refs, bodies])

  useEffect(() => () => worker.terminate(), [])

  const api = useMemo(() => ({ worker, bodies, setRef }), [worker, bodies])
  return <context.Provider value={api}>{children}</context.Provider>
}

export function useBody(type: ShapeType, fn: BodyFn, argFn: ArgFn, deps: any[] = []): Api {
  const ref = useRef<THREE.Object3D>()
  const { worker, bodies, setRef } = useContext(context)

  useEffect(() => {
    if (ref.current && worker) {
      const object = ref.current
      const currentWorker = worker

      if (object instanceof THREE.InstancedMesh) {
        const uuid = new Array(object.count).fill(0).map((_, i) => `${object.uuid}/${i}`)
        // Why? Because @mrdoob did it in his example ...
        object.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        // Collect props
        const props = uuid.map((id, i) => {
          const props = fn(i)
          if (props.args) props.args = argFn(props.args)
          return props
        })
        // Set start-up position values
        props.forEach(({ position, rotation, scale }, i) => {
          if (position || rotation || scale) {
            temp.position.set(...((position || [0, 0, 0]) as [number, number, number]))
            temp.rotation.set(...((rotation || [0, 0, 0]) as [number, number, number]))
            temp.scale.set(...((scale || [1, 1, 1]) as [number, number, number]))
            temp.updateMatrix()
            object.setMatrixAt(i, temp.matrix)
            object.instanceMatrix.needsUpdate = true
          }
        })
        // Add bodies
        currentWorker.postMessage({ op: 'addBodies', uuid, type, props })
        // Add refs to the collection
        setRef(refs => ({ ...refs, ...uuid.reduce((acc, i) => ({ ...acc, [i]: object }), {}) }))
        // Unmount ...
        return () => {
          // Remove body from worker
          currentWorker.postMessage({ op: 'removeBodies', uuid, type })
          // Remove ref from collection
          setRef(refs => {
            const temp = { ...refs }
            uuid.forEach(id => delete temp[id])
            return temp
          })
        }
      } else {
        const uuid = object.uuid
        // Collect props
        const props = fn()
        if (props.args) props.args = argFn(props.args)
        // Set start-up position values
        if (props.position) object.position.set(...(props.position as [number, number, number]))
        if (props.rotation) object.rotation.set(...(props.rotation as [number, number, number]))
        if (props.scale) object.scale.set(...(props.scale as [number, number, number]))
        // Add body
        currentWorker.postMessage({ op: 'addBody', type, uuid, props })
        // Add ref to the collection
        setRef(refs => ({ ...refs, [uuid]: object }))
        // Unmount ...
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
    }
  }, [ref.current, worker, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (ref.current && buffers.current && buffers.current.positions.length) {
      if (ref.current instanceof THREE.InstancedMesh) {
        for (let i = 0; i < ref.current.count; i++) {
          const index = bodies.current[`${ref.current.uuid}/${i}`]
          if (index !== undefined) {
            temp.position.fromArray(buffers.current.positions, index * 3)
            temp.quaternion.fromArray(buffers.current.quaternions, index * 4)
            temp.updateMatrix()
            ref.current.setMatrixAt(i, temp.matrix)
          }
          ref.current.instanceMatrix.needsUpdate = true
        }
      } else {
        const index = bodies.current[ref.current.uuid]
        if (index !== undefined) {
          ref.current.position.fromArray(buffers.current.positions, index * 3)
          ref.current.quaternion.fromArray(buffers.current.quaternions, index * 4)
        }
      }
    }
  })

  const api = useMemo(() => {
    if (worker)
      return {
        setPosition(x: number, y: number, z: number) {
          if (ref.current) worker.postMessage({ op: 'setPosition', uuid: ref.current.uuid, props: [x, y, z] })
        },
        setRotation(x: number, y: number, z: number) {
          if (ref.current) worker.postMessage({ op: 'setRotation', uuid: ref.current.uuid, props: [x, y, z] })
        },
        setPositionAt(index: number, x: number, y: number, z: number) {
          if (ref.current)
            worker.postMessage({
              op: 'setPosition',
              uuid: `${ref.current.uuid}/${index}`,
              props: [x, y, z],
            })
        },
        setRotationAt(index: number, x: number, y: number, z: number) {
          if (ref.current)
            worker.postMessage({
              op: 'setRotation',
              uuid: `${ref.current.uuid}/${index}`,
              props: [x, y, z],
            })
        },
      }
  }, [worker])

  return [ref, api]
}

export function usePlane(fn: PlaneFn, deps: any[] = []) {
  return useBody('Plane', fn, () => [], deps)
}
export function useBox(fn: BoxFn, deps: any[] = []) {
  return useBody('Box', fn, args => args, deps)
}
export function useCylinder(fn: CylinderFn, deps: any[] = []) {
  return useBody('Cylinder', fn, args => args, deps)
}
export function useHeightfield(fn: HeightfieldFn, deps: any[] = []) {
  return useBody('Heightfield', fn, args => args, deps)
}
export function useParticle(fn: ParticleFn, deps: any[] = []) {
  return useBody('Particle', fn, () => [], deps)
}
export function useSphere(fn: SphereFn, deps: any[] = []) {
  return useBody('Sphere', fn, radius => [radius], deps)
}
export function useTrimesh(fn: TrimeshFn, deps: any[] = []) {
  return useBody('Trimesh', fn, args => args, deps)
}
