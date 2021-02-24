import type { MaterialOptions, RayOptions } from 'cannon-es'
import type { Buffers, Event } from './setup'
import * as THREE from 'three'
import React, { useLayoutEffect, useContext, useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from 'react-three-fiber'
import { context } from './setup'

export type AtomicProps = {
  mass?: number
  material?: MaterialOptions
  linearDamping?: number
  angularDamping?: number
  allowSleep?: boolean
  sleepSpeedLimit?: number
  sleepTimeLimit?: number
  collisionFilterGroup?: number
  collisionFilterMask?: number
  collisionResponse?: number
  fixedRotation?: boolean
}

export type BodyProps = AtomicProps & {
  args?: any
  position?: number[]
  rotation?: number[]
  velocity?: number[]
  angularVelocity?: number[]
  linearFactor?: number[]
  angularFactor?: number[]
  type?: 'Dynamic' | 'Static' | 'Kinematic'
  onCollide?: (e: Event) => void
}

export type ShapeType =
  | 'Plane'
  | 'Box'
  | 'Cylinder'
  | 'Heightfield'
  | 'Particle'
  | 'Sphere'
  | 'Trimesh'
  | 'ConvexPolyhedron'
export type BodyShapeType = ShapeType | 'Compound'
export type PlaneProps = BodyProps & {}
export type BoxProps = BodyProps & { args?: number[] }
export type CylinderProps = BodyProps & { args?: [number, number, number, number] }
export type ParticleProps = BodyProps & {}
export type SphereProps = BodyProps & { args?: number }
export type TrimeshProps = BodyProps & {
  args?: [(THREE.Vector3 | number[])[], number[][]]
}
export type HeightfieldProps = BodyProps & {
  args?: [number[], { minValue?: number; maxValue?: number; elementSize?: number }]
}
export type ConvexPolyhedronProps = BodyProps & {
  args?: [(THREE.Vector3 | number[])[], number[][]]
}
export type CompoundBodyProps = BodyProps & {
  shapes: BodyProps & { type: ShapeType }[]
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
type CompoundBodyFn = (index: number) => CompoundBodyProps
type ArgFn = (props: any) => any[]

type WorkerVec = {
  set: (x: number, y: number, z: number) => void
  copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => void
  subscribe: (callback: (value: number[]) => void) => void
}

export type WorkerProps<T> = {
  [K in keyof T]: {
    set: (value: T[K]) => void
    subscribe: (callback: (value: T[K]) => void) => () => void
  }
}
export type WorkerApi = WorkerProps<AtomicProps> & {
  position: WorkerVec
  rotation: WorkerVec
  velocity: WorkerVec
  angularVelocity: WorkerVec
  linearFactor: WorkerVec
  angularFactor: WorkerVec
  applyForce: (force: number[], worldPoint: number[]) => void
  applyImpulse: (impulse: number[], worldPoint: number[]) => void
  applyLocalForce: (force: number[], localPoint: number[]) => void
  applyLocalImpulse: (impulse: number[], localPoint: number[]) => void
}

type PublicApi = WorkerApi & { at: (index: number) => WorkerApi }
export type Api = [React.MutableRefObject<THREE.Object3D | undefined>, PublicApi]

export type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Hinge' | 'Lock'

export type ConstraintOptns = { maxForce?: number; collideConnected?: boolean; wakeUpBodies?: boolean }

export type PointToPointConstraintOpts = ConstraintOptns & {
  pivotA: number[]
  pivotB: number[]
}

export type ConeTwistConstraintOpts = ConstraintOptns & {
  pivotA?: number[]
  axisA?: number[]
  pivotB?: number[]
  axisB?: number[]
  angle?: number
  twistAngle?: number
}
export type DistanceConstraintOpts = ConstraintOptns & { distance?: number }

export type HingeConstraintOpts = ConstraintOptns & {
  pivotA?: number[]
  axisA?: number[]
  pivotB?: number[]
  axisB?: number[]
}

export type LockConstraintOpts = ConstraintOptns & {}

export type SpringOptns = {
  restLength?: number
  stiffness?: number
  damping?: number
  worldAnchorA?: number[]
  worldAnchorB?: number[]
  localAnchorA?: number[]
  localAnchorB?: number[]
}

const temp = new THREE.Object3D()

function prepare(object: THREE.Object3D, props: BodyProps, argFn: ArgFn) {
  props.args = argFn(props.args)
  object.position.set(...((props.position || [0, 0, 0]) as [number, number, number]))
  object.rotation.set(...((props.rotation || [0, 0, 0]) as [number, number, number]))
  return props
}

function apply(object: THREE.Object3D, index: number, buffers: Buffers) {
  if (index !== undefined) {
    object.position.fromArray(buffers.positions, index * 3)
    object.quaternion.fromArray(buffers.quaternions, index * 4)
  }
}

let subscriptionGuid = 0

function useBody(
  type: BodyShapeType,
  fn: BodyFn,
  argFn: ArgFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>
): Api {
  const localRef = useRef<THREE.Object3D>((null as unknown) as THREE.Object3D)
  const ref = fwdRef ? fwdRef : localRef
  const { worker, bodies, buffers, refs, events, subscriptions } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new THREE.Object3D()
    }

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
      refs[uuid[index]] = object
      if (props.onCollide) {
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    const post = (op: string, index?: number, props?: any) =>
      ref.current && worker.postMessage({ op, uuid: getUUID(index), props })
    const subscribe = (type: string, index?: number) => {
      return (callback: (value: any) => void) => {
        const id = subscriptionGuid++
        subscriptions[id] = callback
        post('subscribe', index, { id, type })
        return () => {
          delete subscriptions[id]
          post('unsubscribe', index, id)
        }
      }
    }
    const opString = (action: string, type: string) => action + type.charAt(0).toUpperCase() + type.slice(1)
    const makeVec = (type: string, index?: number) => ({
      set: (x: number, y: number, z: number) => post(opString('set', type), index, [x, y, z]),
      copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => post(opString('set', type), index, [x, y, z]),
      subscribe: subscribe(type, index),
    })
    const makeAtomic = (type: string, index?: number) => ({
      set: (value: any) => post(opString('set', type), index, value),
      subscribe: subscribe(type, index),
    })

    function makeApi(index?: number): WorkerApi {
      return {
        // Vectors
        position: makeVec('position', index),
        rotation: makeVec('quaternion', index),
        velocity: makeVec('velocity', index),
        angularVelocity: makeVec('angularVelocity', index),
        linearFactor: makeVec('linearFactor', index),
        angularFactor: makeVec('angularFactor', index),
        // Atomic props
        mass: makeAtomic('mass', index),
        linearDamping: makeAtomic('linearDamping', index),
        angularDamping: makeAtomic('angularDamping', index),
        allowSleep: makeAtomic('allowSleep', index),
        sleepSpeedLimit: makeAtomic('sleepSpeedLimit', index),
        sleepTimeLimit: makeAtomic('sleepTimeLimit', index),
        collisionFilterGroup: makeAtomic('collisionFilterGroup', index),
        collisionFilterMask: makeAtomic('collisionFilterMask', index),
        collisionResponse: makeAtomic('collisionResponse', index),
        fixedRotation: makeAtomic('fixedRotation', index),
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

export function usePlane(fn: PlaneFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Plane', fn, () => [], fwdRef)
}
export function useBox(fn: BoxFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Box', fn, (args) => args || [1, 1, 1], fwdRef)
}
export function useCylinder(fn: CylinderFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Cylinder', fn, (args) => args, fwdRef)
}
export function useHeightfield(fn: HeightfieldFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Heightfield', fn, (args) => args, fwdRef)
}
export function useParticle(fn: ParticleFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Particle', fn, () => [], fwdRef)
}
export function useSphere(fn: SphereFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Sphere', fn, (radius) => [radius ?? 1], fwdRef)
}
export function useTrimesh(fn: TrimeshFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody(
    'Trimesh',
    fn,
    (args) => {
      return [args[0].map((v: any) => (v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v)), args[1]]
    },
    fwdRef
  )
}
export function useConvexPolyhedron(fn: ConvexPolyhedronFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody(
    'ConvexPolyhedron',
    fn,
    (args) => {
      return [
        args[0].map((v: any) => (v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v)),
        args[1],
        args[2] && args[2].map((n: any) => (n instanceof THREE.Vector3 ? [n.x, n.y, n.z] : n)),
      ]
    },
    fwdRef
  )
}
export function useCompoundBody(fn: CompoundBodyFn, fwdRef?: React.MutableRefObject<THREE.Object3D>) {
  return useBody('Compound', fn, (args) => args || [], fwdRef)
}

type ConstraintApi = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  React.MutableRefObject<THREE.Object3D | undefined>,
  {
    enable: () => void
    disable: () => void
  }
]

function useConstraint(
  type: ConstraintTypes,
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: any = {},
  deps: any[] = []
): ConstraintApi {
  const { worker } = useContext(context)
  const uuid = THREE.MathUtils.generateUUID()

  const nullRef1 = useRef((null as unknown) as THREE.Object3D)
  const nullRef2 = useRef((null as unknown) as THREE.Object3D)
  bodyA = bodyA === undefined || bodyA === null ? nullRef1 : bodyA
  bodyB = bodyB === undefined || bodyB === null ? nullRef2 : bodyB

  useEffect(() => {
    if (bodyA.current && bodyB.current) {
      worker.postMessage({
        op: 'addConstraint',
        uuid,
        type,
        props: [bodyA.current.uuid, bodyB.current.uuid, optns],
      })
      return () => worker.postMessage({ op: 'removeConstraint', uuid })
    }
  }, deps)

  const api = useMemo(
    () => ({
      enable: () => worker.postMessage({ op: 'enableConstraint', uuid }),
      disable: () => worker.postMessage({ op: 'disableConstraint', uuid }),
    }),
    deps
  )

  return [bodyA, bodyB, api]
}

export function usePointToPointConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: PointToPointConstraintOpts,
  deps: any[] = []
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: ConeTwistConstraintOpts,
  deps: any[] = []
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: DistanceConstraintOpts,
  deps: any[] = []
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: HingeConstraintOpts,
  deps: any[] = []
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: LockConstraintOpts,
  deps: any[] = []
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: SpringOptns,
  deps: any[] = []
) {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => THREE.MathUtils.generateUUID())

  const nullRef1 = useRef((null as unknown) as THREE.Object3D)
  const nullRef2 = useRef((null as unknown) as THREE.Object3D)
  bodyA = bodyA === undefined || bodyA === null ? nullRef1 : bodyA
  bodyB = bodyB === undefined || bodyB === null ? nullRef2 : bodyB

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

  return [bodyA, bodyB]
}

type RayOptns = Omit<RayOptions, 'mode' | 'from' | 'to' | 'result' | 'callback'> & {
  from?: number[]
  to?: number[]
}

function useRay(
  mode: 'Closest' | 'Any' | 'All',
  options: RayOptns,
  callback: (e: Event) => void,
  deps: any[] = []
) {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => THREE.MathUtils.generateUUID())
  useEffect(() => {
    events[uuid] = callback
    worker.postMessage({ op: 'addRay', uuid, props: { mode, ...options } })
    return () => {
      worker.postMessage({ op: 'removeRay', uuid })
      delete events[uuid]
    }
  }, deps)
}

export function useRaycastClosest(options: RayOptns, callback: (e: Event) => void, deps: any[] = []) {
  useRay('Closest', options, callback, deps)
}

export function useRaycastAny(options: RayOptns, callback: (e: Event) => void, deps: any[] = []) {
  useRay('Any', options, callback, deps)
}

export function useRaycastAll(options: RayOptns, callback: (e: Event) => void, deps: any[] = []) {
  useRay('All', options, callback, deps)
}

type RaycastVehiclePublicApi = {
  // addWheel: () => number
  setSteeringValue: (value: number, wheelIndex: number) => void
  applyEngineForce: (value: number, wheelIndex: number) => void
  setBrake: (brake: number, wheelIndex: number) => void
}

type RaycastVehicleApi = [React.MutableRefObject<THREE.Object3D | undefined>, RaycastVehiclePublicApi]

type WheelInfoOptions = {
  radius?: number
  directionLocal?: number[]
  suspensionStiffness?: number
  suspensionRestLength?: number
  maxSuspensionForce?: number
  maxSuspensionTravel?: number
  dampingRelaxation?: number
  dampingCompression?: number
  frictionSlip?: number
  rollInfluence?: number
  axleLocal?: number[]
  chassisConnectionPointLocal?: number[]
  isFrontWheel?: boolean
  useCustomSlidingRotationalSpeed?: boolean
  customSlidingRotationalSpeed?: number
}

type RaycastVehicleProps = {
  chassisBody: React.MutableRefObject<THREE.Object3D | undefined>
  wheels: React.MutableRefObject<THREE.Object3D | undefined>[]
  wheelInfos: WheelInfoOptions[]
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
}

type RaycastVehicleFn = () => RaycastVehicleProps

export function useRaycastVehicle(
  fn: RaycastVehicleFn,
  fwdRef?: React.MutableRefObject<THREE.Object3D>
): RaycastVehicleApi {
  const ref = fwdRef ? fwdRef : useRef<THREE.Object3D>((null as unknown) as THREE.Object3D)
  const { worker } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new THREE.Object3D()
    }

    const currentWorker = worker
    let uuid: string[] = [ref.current.uuid]

    const raycastVehicleProps = fn()

    currentWorker.postMessage({
      op: 'addRaycastVehicle',
      uuid,
      props: [
        raycastVehicleProps.chassisBody.current?.uuid,
        raycastVehicleProps.wheels.map((wheel) => wheel.current?.uuid),
        raycastVehicleProps.wheelInfos,
        raycastVehicleProps?.indexForwardAxis || 2,
        raycastVehicleProps?.indexRightAxis || 0,
        raycastVehicleProps?.indexUpAxis || 1,
      ],
    })
    return () => {
      currentWorker.postMessage({ op: 'removeRaycastVehicle', uuid })
    }
  }, [])

  const api = useMemo(() => {
    const post = (op: string, props?: any) =>
      ref.current && worker.postMessage({ op, uuid: ref.current.uuid, props })
    return {
      setSteeringValue(value: number, wheelIndex: number) {
        post('setRaycastVehicleSteeringValue', [value, wheelIndex])
      },
      applyEngineForce(value: number, wheelIndex: number) {
        post('applyRaycastVehicleEngineForce', [value, wheelIndex])
      },
      setBrake(brake: number, wheelIndex: number) {
        post('setRaycastVehicleBrake', [brake, wheelIndex])
      },
    }
  }, [])
  return [ref, api]
}
