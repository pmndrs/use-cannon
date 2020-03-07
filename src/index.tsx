import * as THREE from 'three'
import React, { useState, useEffect, useLayoutEffect, useContext, useRef, useMemo } from 'react'
import { useFrame } from 'react-three-fiber'
// @ts-ignore
import CannonWorker from '../src/worker'

type PhysicsProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
  iterations?: number
  size?: number
}

type PhysicsContext = {
  worker: Worker
  bodies: React.MutableRefObject<{ [uuid: string]: number }>
  buffers: { positions: Float32Array; quaternions: Float32Array }
}

type WorkerEvent = {
  data: {
    op: string
    positions: Float32Array
    quaternions: Float32Array
    bodies: string[]
  }
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

type ShapeType = 'Plane' | 'Box' | 'Cylinder' | 'Heightfield' | 'Particle' | 'Sphere' | 'Trimesh' | 'ConvexPolyhedron'
type PlaneProps = BodyProps & {}
type BoxProps = BodyProps & { args?: number[] }
type CylinderProps = BodyProps & { args?: [number, number, number, number] }
type ParticleProps = BodyProps & {}
type SphereProps = BodyProps & { args?: number }
type TrimeshProps = BodyProps & { args?: [number[][], number[][]] }
type HeightfieldProps = BodyProps & {
  args?: [number[], { minValue?: number; maxValue?: number; elementSize?: number }]
}
type ConvexPolyhedronProps = BodyProps & {
  args?: THREE.Geometry | [(THREE.Vector3 | number[])[], (THREE.Face3 | number[])[]]
}

type BodyFn = (index: number) => BodyProps
type PlaneFn = (index: number) => PlaneProps
type BoxFn = (index: number) => BoxProps
type CylinderFn = (index: number) => CylinderProps
type HeightfieldFn = (index: number) => HeightfieldProps
type ParticleFn = (index: number) => ParticleProps
type SphereFn = (index: number) => SphereProps
type TrimeshFn = (index: number) => TrimeshProps
type ConvexPolyhedronFn = (index: number) => ConvexPolyhedronProps
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
const temp = new THREE.Object3D()

export function Physics({
  children,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
  size = 1000,
}: PhysicsProps): JSX.Element {
  const [worker] = useState<Worker>(() => new CannonWorker() as Worker)
  const [buffers] = useState(() => ({ positions: new Float32Array(size * 3), quaternions: new Float32Array(size * 4) }))
  const bodies = useRef<{ [uuid: string]: number }>({})

  useEffect(() => {
    worker.postMessage({ op: 'init', props: { gravity, tolerance, step, iterations } })

    function loop() {
      worker.postMessage({ op: 'step', ...buffers }, [buffers.positions.buffer, buffers.quaternions.buffer])
    }

    worker.onmessage = (e: WorkerEvent) => {
      switch (e.data.op) {
        case 'frame': {
          buffers.positions = e.data.positions
          buffers.quaternions = e.data.quaternions
          requestAnimationFrame(loop)
          break
        }
        case 'sync': {
          bodies.current = e.data.bodies.reduce((acc, id) => ({ ...acc, [id]: e.data.bodies.indexOf(id) }), {})
          break
        }
      }
    }
    loop()
    return () => worker.terminate()
  }, [])

  const api = useMemo(() => ({ worker, bodies, buffers }), [worker, bodies, buffers])
  return <context.Provider value={api as PhysicsContext}>{children}</context.Provider>
}

export function useBody(type: ShapeType, fn: BodyFn, argFn: ArgFn, deps: any[] = []): Api {
  const ref = useRef<THREE.Object3D>()
  const { worker, bodies, buffers } = useContext(context)
  useLayoutEffect(() => {
    if (ref.current) {
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
        // Unmount ...
        return () => {
          // Remove body from worker
          currentWorker.postMessage({ op: 'removeBodies', uuid, type })
        }
      } else {
        const uuid = object.uuid
        // Collect props
        const props = fn(0)
        if (props.args) props.args = argFn(props.args)
        // Set start-up position values
        if (props.position) object.position.set(...(props.position as [number, number, number]))
        if (props.rotation) object.rotation.set(...(props.rotation as [number, number, number]))
        if (props.scale) object.scale.set(...(props.scale as [number, number, number]))
        // Add body
        currentWorker.postMessage({ op: 'addBody', type, uuid, props })
        // Unmount ...
        return () => {
          // Remove body from worker
          currentWorker.postMessage({ op: 'removeBody', uuid })
        }
      }
    }
  }, [ref.current, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const { positions, quaternions } = buffers
    if (ref.current && positions.length && quaternions.length) {
      if (ref.current instanceof THREE.InstancedMesh) {
        for (let i = 0; i < ref.current.count; i++) {
          const index = bodies.current[`${ref.current.uuid}/${i}`]
          if (index !== undefined) {
            temp.position.fromArray(positions, index * 3)
            temp.quaternion.fromArray(quaternions, index * 4)
            temp.updateMatrix()
            ref.current.setMatrixAt(i, temp.matrix)
          }
          ref.current.instanceMatrix.needsUpdate = true
        }
      } else {
        const index = bodies.current[ref.current.uuid]
        if (index !== undefined) {
          ref.current.position.fromArray(positions, index * 3)
          ref.current.quaternion.fromArray(quaternions, index * 4)
        }
      }
    }
  })

  const api = useMemo(() => {
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
  }, [])

  return [ref, api]
}

export function usePlane(fn: PlaneFn, deps: any[] = []) {
  return useBody('Plane', fn, () => [], deps)
}
export function useBox(fn: BoxFn, deps: any[] = []) {
  return useBody('Box', fn, args => args || [0.5, 0.5, 0.5], deps)
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
  return useBody('Sphere', fn, radius => [radius ?? 1], deps)
}
export function useTrimesh(fn: TrimeshFn, deps: any[] = []) {
  return useBody('Trimesh', fn, args => args, deps)
}
export function useConvexPolyhedron(fn: ConvexPolyhedronFn, deps: any[] = []) {
  return useBody(
    'ConvexPolyhedron',
    fn,
    args => {
      const vertices = args instanceof THREE.Geometry ? args.vertices : args[0]
      const faces = args instanceof THREE.Geometry ? args.faces : args[1]
      return [
        vertices.map((v: any) => (v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v)),
        faces.map((f: any) => (f instanceof THREE.Face3 ? [f.a, f.b, f.c] : f)),
      ]
    },
    deps
  )
}
