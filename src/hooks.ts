import * as THREE from 'three'
import React, { useLayoutEffect, useContext, useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from 'react-three-fiber'
import { Buffers } from './Provider'
import { context, Event } from './index'

type AtomicProps = {
  mass?: number
  linearDamping?: number
  angularDamping?: number
  allowSleep?: boolean
  sleepSpeedLimit?: number
  sleepTimeLimit?: number
  collisionFilterGroup?: number
  collisionFilterMask?: number
  fixedRotation?: boolean
}

type BodyProps = AtomicProps & {
  ref?: React.MutableRefObject<THREE.Object3D>
  args?: any
  position?: number[]
  rotation?: number[]
  velocity?: number[]
  angularVelocity?: number[]
  scale?: number[]
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

type WorkerVec = {
  set: (x: number, y: number, z: number) => void
  copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => void
}

type WorkerApi = AtomicProps & {
  position: WorkerVec
  rotation: WorkerVec
  velocity: WorkerVec
  angularVelocity: WorkerVec
  applyForce: (force: number[], worldPoint: number[]) => void
  applyImpulse: (impulse: number[], worldPoint: number[]) => void
  applyLocalForce: (force: number[], localPoint: number[]) => void
  applyLocalImpulse: (impulse: number[], localPoint: number[]) => void
}

type Api = [React.MutableRefObject<THREE.Object3D | undefined>, WorkerApi]

type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Hinge' | 'Lock'

type ConstraintOptns = { maxForce?: number; collideConnected?: boolean; wakeUpBodies?: boolean }

type PointToPointConstraintOpts = ConstraintOptns & {
  pivotA: number[]
  pivotB: number[]
}

type ConeTwistConstraintOpts = ConstraintOptns & {
  pivotA?: number[]
  axisA?: number[]
  pivotB?: number[]
  axisB?: number[]
}
type DistanceConstraintOpts = ConstraintOptns & { distance?: number }

type HingeConstraintOpts = ConstraintOptns & {
  pivotA?: number[]
  axisA?: number[]
  pivotB?: number[]
  axisB?: number[]
}

type LockConstraintOpts = ConstraintOptns & {}

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
  const { ref: fwdRef } = fn(0)
  const localRef = useRef<THREE.Object3D>((null as unknown) as THREE.Object3D)
  const ref = fwdRef ? fwdRef : localRef
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
      delete props.ref
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
    const getUUID = (index?: number) =>
      index !== undefined ? `${ref.current.uuid}/${index}` : ref.current.uuid
    const post = (op: string, index: number | undefined, props: any) =>
      ref.current && worker.postMessage({ op, uuid: getUUID(index), props })
    const makeVec = (op: string, index: number | undefined) => ({
      set: (x: number, y: number, z: number) => post(op, index, [x, y, z]),
      copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => post(op, index, [x, y, z]),
    })

    function makeApi(index?: number): WorkerApi {
      return {
        // Vectors
        position: makeVec('setPosition', index),
        rotation: makeVec('setRotation', index),
        velocity: makeVec('setVelocity', index),
        angularVelocity: makeVec('setAngularVelocity', index),
        // Setters
        set mass(value: number) {
          post('setMass', index, value)
        },
        set linearDamping(value: number) {
          post('setLinearDamping', index, value)
        },
        set angularDamping(value: number) {
          post('setAngularDamping', index, value)
        },
        set allowSleep(value: boolean) {
          post('setAllowSleep', index, value)
        },
        set sleepSpeedLimit(value: number) {
          post('setSleepSpeedLimit', index, value)
        },
        set sleepTimeLimit(value: number) {
          post('setSleepTimeLimit', index, value)
        },
        set collisionFilterGroup(value: number) {
          post('setCollisionFilterGroup', index, value)
        },
        set collisionFilterMask(value: number) {
          post('setCollisionFilterMask', index, value)
        },
        set fixedRotation(value: boolean) {
          post('setFixedRotation', index, value)
        },
        // Apply functions
        applyForce(force: number[], worldPoint: number[]) {
          post('applyForce', index, [force, worldPoint])
        },
        applyImpulse(impulse: number[], worldPoint: number[]) {
          post('applyImpulse', index, [impulse, worldPoint])
        },
        applyLocalForce(force: number[], localPoint: number[]) {
          post('applyLocalForce', index, [force, localPoint])
        },
        applyLocalImpulse(impulse: number[], localPoint: number[]) {
          post('applyLocalImpulse', index, [impulse, localPoint])
        },
      }
    }

    const cache: { [index: number]: WorkerApi } = {}
    return {
      ...makeApi(undefined),
      at: (index: number) => cache[index] || (cache[index] = makeApi(index)),
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

function useConstraint(
  type: ConstraintTypes,
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: any = {},
  deps: any[] = []
) {
  const { worker } = useContext(context)
  const [uuid] = useState(() => THREE.MathUtils.generateUUID())

  useEffect(() => {
    if (bodyA.current && bodyB.current) {
      worker.postMessage({
        op: 'addConstraint',
        uuid,
        type: type,
        props: [bodyA.current.uuid, bodyB.current.uuid, optns],
      })
      return () => worker.postMessage({ op: 'removeConstraint', uuid })
    }
  }, deps)
}

export function usePointToPointConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: PointToPointConstraintOpts,
  deps: any[]
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: ConeTwistConstraintOpts,
  deps: any[]
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: DistanceConstraintOpts,
  deps: any[]
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: HingeConstraintOpts,
  deps: any[]
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: LockConstraintOpts,
  deps: any[]
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: any = {},
  deps: any[] = []
) {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => THREE.MathUtils.generateUUID())

  useEffect(() => {
    if (bodyA.current && bodyB.current) {
      worker.postMessage({
        op: 'addSpring',
        uuid,
        props: [bodyA.current.uuid, bodyB.current.uuid, optns],
      })
      events[uuid] = () => {}
      return () => {
        worker.postMessage({ op: 'removeSpring', uuid })
        delete events[uuid]
      }
    }
  }, deps)
}
