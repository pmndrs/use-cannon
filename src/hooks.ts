import * as THREE from 'three'
import React, { useLayoutEffect, useContext, useRef, useMemo } from 'react'
import { useFrame } from 'react-three-fiber'
import { Buffers } from './Provider'
import { context, Event } from './index'

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
  type?: 'Dynamic' | 'Static' | 'Kinematic'
  onCollide?: (e: Event) => void
}

type ShapeType =
  | 'Plane'
  | 'Box'
  | 'Cylinder'
  | 'Heightfield'
  | 'Particle'
  | 'Sphere'
  | 'Trimesh'
  | 'ConvexPolyhedron'
type PlaneProps = BodyProps & {}
type BoxProps = BodyProps & { args?: number[] }
type CylinderProps = BodyProps & { args?: [number, number, number, number] }
type ParticleProps = BodyProps & {}
type SphereProps = BodyProps & { args?: number }
type TrimeshProps = BodyProps & {
  args?: THREE.Geometry | [(THREE.Vector3 | number[])[], (THREE.Face3 | number[])[]]
}
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
  {
    setPosition: (x: number, y: number, z: number) => void
    setRotation: (x: number, y: number, z: number) => void
    setPositionAt: (index: number, x: number, y: number, z: number) => void
    setRotationAt: (index: number, x: number, y: number, z: number) => void
    applyForce: (force: [number, number, number], worldPoint: [number, number, number]) => void
    applyImpulse: (impulse: [number, number, number], worldPoint: [number, number, number]) => void
    applyLocalForce: (force: [number, number, number], localPoint: [number, number, number]) => void
    applyLocalImpulse: (
      impulse: [number, number, number],
      localPoint: [number, number, number]
    ) => void
  }
]

const temp = new THREE.Object3D()

function prepare(object: THREE.Object3D, props: BodyProps, argFn: ArgFn) {
  props.args = argFn(props.args)
  object.position.set(...((props.position || [0, 0, 0]) as [number, number, number]))
  object.rotation.set(...((props.rotation || [0, 0, 0]) as [number, number, number]))
  object.scale.set(...((props.scale || [1, 1, 1]) as [number, number, number]))
  return props
}

function apply(object: THREE.Object3D, index: number, buffers: Buffers) {
  if (index !== undefined) {
    object.position.fromArray(buffers.positions, index * 3)
    object.quaternion.fromArray(buffers.quaternions, index * 4)
  }
}

function useBody(type: ShapeType, fn: BodyFn, argFn: ArgFn, deps: any[] = []): Api {
  const ref = useRef<THREE.Object3D>((null as unknown) as THREE.Object3D)
  const { worker, bodies, buffers, refs, events } = useContext(context)

  useLayoutEffect(() => {
    const object = ref.current
    const currentWorker = worker
    let uuid: string[] = [object.uuid],
      props: BodyProps[]

    if (object instanceof THREE.InstancedMesh) {
      // Why? Because @mrdoob did it in his example ...
      object.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      uuid = new Array(object.count).fill(0).map((_, i) => `${object.uuid}/${i}`)
      props = uuid.map((id, i) => {
        const props = prepare(temp, fn(i), argFn)
        temp.updateMatrix()
        object.setMatrixAt(i, temp.matrix)
        object.instanceMatrix.needsUpdate = true
        return props
      })
    } else props = [prepare(object, fn(0), argFn)]

    props.forEach((props, index) => {
      if (props.onCollide) {
        refs[uuid[index]] = object
        events[uuid[index]] = props.onCollide
        ;(props as any).onCollide = true
      }
    })

    // Register on mount, unregister on unmount
    currentWorker.postMessage({ op: 'addBodies', type, uuid, props })
    return () => {
      props.forEach((props, index) => {
        delete refs[uuid[index]]
        if (props.onCollide) delete events[uuid[index]]
      })
      currentWorker.postMessage({ op: 'removeBodies', uuid })
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (ref.current && buffers.positions.length && buffers.quaternions.length) {
      if (ref.current instanceof THREE.InstancedMesh) {
        for (let i = 0; i < ref.current.count; i++) {
          const index = bodies.current[`${ref.current.uuid}/${i}`]
          if (index !== undefined) {
            apply(temp, index, buffers)
            temp.updateMatrix()
            ref.current.setMatrixAt(i, temp.matrix)
          }
          ref.current.instanceMatrix.needsUpdate = true
        }
      } else apply(ref.current, bodies.current[ref.current.uuid], buffers)
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
      applyForce(force: [number, number, number], worldPoint: [number, number, number]) {
        if (ref.current)
          worker.postMessage({
            op: 'applyForce',
            uuid: ref.current.uuid,
            props: [force, worldPoint],
          })
      },
      applyImpulse(impulse: [number, number, number], worldPoint: [number, number, number]) {
        if (ref.current)
          worker.postMessage({
            op: 'applyImpulse',
            uuid: ref.current.uuid,
            props: [impulse, worldPoint],
          })
      },
      applyLocalForce(force: [number, number, number], localPoint: [number, number, number]) {
        if (ref.current)
          worker.postMessage({
            op: 'applyLocalForce',
            uuid: ref.current.uuid,
            props: [force, localPoint],
          })
      },
      applyLocalImpulse(impulse: [number, number, number], localPoint: [number, number, number]) {
        if (ref.current)
          worker.postMessage({
            op: 'applyLocalImpulse',
            uuid: ref.current.uuid,
            props: [impulse, localPoint],
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
  return useBody(
    'Trimesh',
    fn,
    args => {
      const vertices = args instanceof THREE.Geometry ? args.vertices : args[0]
      const indices = args instanceof THREE.Geometry ? args.faces : args[1]
      return [
        vertices.map((v: any) => (v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v)),
        indices.map((i: any) => (i instanceof THREE.Face3 ? [i.a, i.b, i.c] : i)),
      ]
    },
    deps
  )
}
export function useConvexPolyhedron(fn: ConvexPolyhedronFn, deps: any[] = []) {
  return useBody(
    'ConvexPolyhedron',
    fn,
    args => {
      const vertices = args instanceof THREE.Geometry ? args.vertices : args[0]
      const faces = args instanceof THREE.Geometry ? args.faces : args[1]
      const normals = args instanceof THREE.Geometry ? args.faces.map(f => f.normal) : args[2]
      return [
        vertices.map((v: any) => (v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v)),
        faces.map((f: any) => (f instanceof THREE.Face3 ? [f.a, f.b, f.c] : f)),
        normals && normals.map((n: any) => (n instanceof THREE.Vector3 ? [n.x, n.y, n.z] : n)),
      ]
    },
    deps
  )
}
