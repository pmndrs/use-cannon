import type {
  AtomicName,
  AtomicProps,
  BodyProps,
  BodyShapeType,
  BoxProps,
  CannonWorkerAPI,
  CompoundBodyProps,
  ConeTwistConstraintOpts,
  ConstraintOptns,
  ConstraintTypes,
  ContactMaterialOptions,
  ConvexPolyhedronArgs,
  ConvexPolyhedronProps,
  CylinderProps,
  DistanceConstraintOpts,
  HeightfieldProps,
  HingeConstraintOpts,
  LockConstraintOpts,
  MaterialOptions,
  ParticleProps,
  PlaneProps,
  PointToPointConstraintOpts,
  PropValue,
  Quad,
  RayhitEvent,
  RayMode,
  RayOptions,
  SetOpName,
  SphereArgs,
  SphereProps,
  SpringOptns,
  SubscriptionName,
  Subscriptions,
  SubscriptionTarget,
  TrimeshProps,
  Triplet,
  VectorName,
  WheelInfoOptions,
} from '@pmndrs/cannon-worker-api'
import type { DependencyList, MutableRefObject, Ref, RefObject } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DynamicDrawUsage, Euler, InstancedMesh, MathUtils, Object3D, Quaternion, Vector3 } from 'three'

import { useDebugContext } from './debug-context'
import type { CannonEvents } from './physics-context'
import { usePhysicsContext } from './physics-context'

export type AtomicApi<K extends AtomicName> = {
  set: (value: AtomicProps[K]) => void
  subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
}

export type QuaternionApi = {
  copy: ({ w, x, y, z }: Quaternion) => void
  set: (x: number, y: number, z: number, w: number) => void
  subscribe: (callback: (value: Quad) => void) => () => void
}

export type VectorApi = {
  copy: ({ x, y, z }: Vector3 | Euler) => void
  set: (x: number, y: number, z: number) => void
  subscribe: (callback: (value: Triplet) => void) => () => void
}

export type WorkerApi = {
  [K in AtomicName]: AtomicApi<K>
} & {
  [K in VectorName]: VectorApi
} & {
  applyForce: (force: Triplet, worldPoint: Triplet) => void
  applyImpulse: (impulse: Triplet, worldPoint: Triplet) => void
  applyLocalForce: (force: Triplet, localPoint: Triplet) => void
  applyLocalImpulse: (impulse: Triplet, localPoint: Triplet) => void
  applyTorque: (torque: Triplet) => void
  quaternion: QuaternionApi
  rotation: VectorApi
  scaleOverride: (scale: Triplet) => void
  sleep: () => void
  wakeUp: () => void
}

export interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}
export type Api<O extends Object3D> = [RefObject<O>, PublicApi]

const temp = new Object3D()

function useForwardedRef<T>(ref: Ref<T>): MutableRefObject<T | null> {
  const nullRef = useRef<T>(null)
  return ref && typeof ref !== 'function' ? ref : nullRef
}

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

function getUUID(ref: Ref<Object3D>, index?: number): string | null {
  const suffix = index === undefined ? '' : `/${index}`
  if (typeof ref === 'function') return null
  return ref && ref.current && `${ref.current.uuid}${suffix}`
}

const e = new Euler()
const q = new Quaternion()

const quaternionToRotation = (callback: (v: Triplet) => void) => {
  return (v: Quad) => callback(e.setFromQuaternion(q.fromArray(v)).toArray() as Triplet)
}

let incrementingId = 0

function subscribe<T extends SubscriptionName>(
  ref: RefObject<Object3D>,
  worker: CannonWorkerAPI,
  subscriptions: Subscriptions,
  type: T,
  index?: number,
  target: SubscriptionTarget = 'bodies',
) {
  return (callback: (value: PropValue<T>) => void) => {
    const id = incrementingId++
    subscriptions[id] = { [type]: callback }
    const uuid = getUUID(ref, index)
    uuid && worker.subscribe({ props: { id, target, type }, uuid })
    return () => {
      delete subscriptions[id]
      worker.unsubscribe({ props: id })
    }
  }
}

function prepare(object: Object3D, { position = [0, 0, 0], rotation = [0, 0, 0], userData = {} }: BodyProps) {
  object.userData = userData
  object.position.set(...position)
  object.rotation.set(...rotation)
  object.updateMatrix()
}

function setupCollision(
  events: CannonEvents,
  { onCollide, onCollideBegin, onCollideEnd }: Partial<BodyProps>,
  uuid: string,
) {
  events[uuid] = {
    collide: onCollide,
    collideBegin: onCollideBegin,
    collideEnd: onCollideEnd,
  }
}

type GetByIndex<T extends BodyProps> = (index: number) => T
type ArgFn<T> = (args: T) => unknown[]

function useBody<B extends BodyProps<unknown[]>, O extends Object3D>(
  type: BodyShapeType,
  fn: GetByIndex<B>,
  argsFn: ArgFn<B['args']>,
  fwdRef: Ref<O> = null,
  deps: DependencyList = [],
): Api<O> {
  const ref = useForwardedRef(fwdRef)

  const { events, refs, scaleOverrides, subscriptions, worker } = usePhysicsContext()
  const debugApi = useDebugContext()

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      // Yes, this type may be technically incorrect
      ref.current = new Object3D() as O
    }

    const object = ref.current
    const currentWorker = worker

    const objectCount =
      object instanceof InstancedMesh ? (object.instanceMatrix.setUsage(DynamicDrawUsage), object.count) : 1

    const uuid =
      object instanceof InstancedMesh
        ? new Array(objectCount).fill(0).map((_, i) => `${object.uuid}/${i}`)
        : [object.uuid]

    const props: (B & { args: unknown })[] =
      object instanceof InstancedMesh
        ? uuid.map((id, i) => {
            const props = fn(i)
            prepare(temp, props)
            object.setMatrixAt(i, temp.matrix)
            object.instanceMatrix.needsUpdate = true
            refs[id] = object
            debugApi?.add(id, props, type)
            setupCollision(events, props, id)
            return { ...props, args: argsFn(props.args) }
          })
        : uuid.map((id, i) => {
            const props = fn(i)
            prepare(object, props)
            refs[id] = object
            debugApi?.add(id, props, type)
            setupCollision(events, props, id)
            return { ...props, args: argsFn(props.args) }
          })

    // Register on mount, unregister on unmount
    currentWorker.addBodies({
      props: props.map(({ onCollide, onCollideBegin, onCollideEnd, ...serializableProps }) => {
        return { onCollide: Boolean(onCollide), ...serializableProps }
      }),
      type,
      uuid,
    })
    return () => {
      uuid.forEach((id) => {
        delete refs[id]
        debugApi?.remove(id)
        delete events[id]
      })
      currentWorker.removeBodies({ uuid })
    }
  }, deps)

  const api = useMemo(() => {
    const makeAtomic = <T extends AtomicName>(type: T, index?: number) => {
      const op: SetOpName<T> = `set${capitalize(type)}`

      return {
        set: (value: PropValue<T>) => {
          const uuid = getUUID(ref, index)
          uuid &&
            worker[op]({
              props: value,
              uuid,
            } as never)
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    const makeQuaternion = (index?: number) => {
      const type = 'quaternion'
      return {
        copy: ({ w, x, y, z }: Quaternion) => {
          const uuid = getUUID(ref, index)
          uuid && worker.setQuaternion({ props: [x, y, z, w], uuid })
        },
        set: (x: number, y: number, z: number, w: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker.setQuaternion({ props: [x, y, z, w], uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    const makeRotation = (index?: number) => {
      return {
        copy: ({ x, y, z }: Vector3 | Euler) => {
          const uuid = getUUID(ref, index)
          uuid && worker.setRotation({ props: [x, y, z], uuid })
        },
        set: (x: number, y: number, z: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker.setRotation({ props: [x, y, z], uuid })
        },
        subscribe: (callback: (value: Triplet) => void) => {
          const id = incrementingId++
          const target = 'bodies'
          const type = 'quaternion'
          const uuid = getUUID(ref, index)

          subscriptions[id] = { [type]: quaternionToRotation(callback) }
          uuid && worker.subscribe({ props: { id, target, type }, uuid })
          return () => {
            delete subscriptions[id]
            worker.unsubscribe({ props: id })
          }
        },
      }
    }

    const makeVec = (type: VectorName, index?: number) => {
      const op: SetOpName<VectorName> = `set${capitalize(type)}`
      return {
        copy: ({ x, y, z }: Vector3 | Euler) => {
          const uuid = getUUID(ref, index)
          uuid && worker[op]({ props: [x, y, z], uuid })
        },
        set: (x: number, y: number, z: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker[op]({ props: [x, y, z], uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    function makeApi(index?: number): WorkerApi {
      return {
        allowSleep: makeAtomic('allowSleep', index),
        angularDamping: makeAtomic('angularDamping', index),
        angularFactor: makeVec('angularFactor', index),
        angularVelocity: makeVec('angularVelocity', index),
        applyForce(force: Triplet, worldPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyForce({ props: [force, worldPoint], uuid })
        },
        applyImpulse(impulse: Triplet, worldPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyImpulse({ props: [impulse, worldPoint], uuid })
        },
        applyLocalForce(force: Triplet, localPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyLocalForce({ props: [force, localPoint], uuid })
        },
        applyLocalImpulse(impulse: Triplet, localPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyLocalImpulse({ props: [impulse, localPoint], uuid })
        },
        applyTorque(torque: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.applyTorque({ props: [torque], uuid })
        },
        collisionFilterGroup: makeAtomic('collisionFilterGroup', index),
        collisionFilterMask: makeAtomic('collisionFilterMask', index),
        collisionResponse: makeAtomic('collisionResponse', index),
        fixedRotation: makeAtomic('fixedRotation', index),
        isTrigger: makeAtomic('isTrigger', index),
        linearDamping: makeAtomic('linearDamping', index),
        linearFactor: makeVec('linearFactor', index),
        mass: makeAtomic('mass', index),
        material: makeAtomic('material', index),
        position: makeVec('position', index),
        quaternion: makeQuaternion(index),
        rotation: makeRotation(index),
        scaleOverride(scale) {
          const uuid = getUUID(ref, index)
          if (uuid) scaleOverrides[uuid] = new Vector3(...scale)
        },
        sleep() {
          const uuid = getUUID(ref, index)
          uuid && worker.sleep({ uuid })
        },
        sleepSpeedLimit: makeAtomic('sleepSpeedLimit', index),
        sleepTimeLimit: makeAtomic('sleepTimeLimit', index),
        userData: makeAtomic('userData', index),
        velocity: makeVec('velocity', index),
        wakeUp() {
          const uuid = getUUID(ref, index)
          uuid && worker.wakeUp({ uuid })
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

function makeTriplet(v: Vector3 | Triplet): Triplet {
  return v instanceof Vector3 ? [v.x, v.y, v.z] : v
}

export function usePlane<O extends Object3D>(
  fn: GetByIndex<PlaneProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}
export function useBox<O extends Object3D>(fn: GetByIndex<BoxProps>, fwdRef?: Ref<O>, deps?: DependencyList) {
  const defaultBoxArgs: Triplet = [1, 1, 1]
  return useBody('Box', fn, (args = defaultBoxArgs): Triplet => args, fwdRef, deps)
}
export function useCylinder<O extends Object3D>(
  fn: GetByIndex<CylinderProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody('Cylinder', fn, (args = [] as []) => args, fwdRef, deps)
}
export function useHeightfield<O extends Object3D>(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}
export function useParticle<O extends Object3D>(
  fn: GetByIndex<ParticleProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}
export function useSphere<O extends Object3D>(
  fn: GetByIndex<SphereProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody(
    'Sphere',
    fn,
    (args: SphereArgs = [1]): SphereArgs => {
      if (!Array.isArray(args)) throw new Error('useSphere args must be an array')
      return [args[0]]
    },
    fwdRef,
    deps,
  )
}
export function useTrimesh<O extends Object3D>(
  fn: GetByIndex<TrimeshProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody<TrimeshProps, O>('Trimesh', fn, (args) => args, fwdRef, deps)
}

export function useConvexPolyhedron<O extends Object3D>(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody<ConvexPolyhedronProps, O>(
    'ConvexPolyhedron',
    fn,
    ([vertices, faces, normals, axes, boundingSphereRadius] = []): ConvexPolyhedronArgs<Triplet> => [
      vertices && vertices.map(makeTriplet),
      faces,
      normals && normals.map(makeTriplet),
      axes && axes.map(makeTriplet),
      boundingSphereRadius,
    ],
    fwdRef,
    deps,
  )
}
export function useCompoundBody<O extends Object3D>(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef?: Ref<O>,
  deps?: DependencyList,
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi<A extends Object3D, B extends Object3D> = [
  RefObject<A>,
  RefObject<B>,
  {
    disable: () => void
    enable: () => void
  },
]

type HingeConstraintApi<A extends Object3D, B extends Object3D> = [
  RefObject<A>,
  RefObject<B>,
  {
    disable: () => void
    disableMotor: () => void
    enable: () => void
    enableMotor: () => void
    setMotorMaxForce: (value: number) => void
    setMotorSpeed: (value: number) => void
  },
]

type SpringApi<A extends Object3D, B extends Object3D> = [
  RefObject<A>,
  RefObject<B>,
  {
    setDamping: (value: number) => void
    setRestLength: (value: number) => void
    setStiffness: (value: number) => void
  },
]

type ConstraintORHingeApi<
  T extends 'Hinge' | ConstraintTypes,
  A extends Object3D,
  B extends Object3D,
> = T extends ConstraintTypes ? ConstraintApi<A, B> : HingeConstraintApi<A, B>

function useConstraint<T extends 'Hinge' | ConstraintTypes, A extends Object3D, B extends Object3D>(
  type: T,
  bodyA: Ref<A>,
  bodyB: Ref<B>,
  optns: ConstraintOptns | HingeConstraintOpts = {},
  deps: DependencyList = [],
): ConstraintORHingeApi<T, A, B> {
  const { worker } = usePhysicsContext()
  const uuid = MathUtils.generateUUID()

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.addConstraint({
        props: [refA.current.uuid, refB.current.uuid, optns],
        type,
        uuid,
      })
      return () => worker.removeConstraint({ uuid })
    }
  }, deps)

  const api = useMemo(() => {
    const enableDisable = {
      disable: () => worker.disableConstraint({ uuid }),
      enable: () => worker.enableConstraint({ uuid }),
    }

    if (type === 'Hinge') {
      return {
        ...enableDisable,
        disableMotor: () => worker.disableConstraintMotor({ uuid }),
        enableMotor: () => worker.enableConstraintMotor({ uuid }),
        setMotorMaxForce: (value: number) => worker.setConstraintMotorMaxForce({ props: value, uuid }),
        setMotorSpeed: (value: number) => worker.setConstraintMotorSpeed({ props: value, uuid }),
      }
    }

    return enableDisable
  }, deps)

  return [refA, refB, api] as ConstraintORHingeApi<T, A, B>
}

export function usePointToPointConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: PointToPointConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: ConeTwistConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: DistanceConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: HingeConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: LockConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring<A extends Object3D, B extends Object3D>(
  bodyA: Ref<A> = null,
  bodyB: Ref<B> = null,
  optns: SpringOptns,
  deps: DependencyList = [],
): SpringApi<A, B> {
  const { worker } = usePhysicsContext()
  const [uuid] = useState(() => MathUtils.generateUUID())

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.addSpring({
        props: [refA.current.uuid, refB.current.uuid, optns],
        uuid,
      })
      return () => {
        worker.removeSpring({ uuid })
      }
    }
  }, deps)

  const api = useMemo(
    () => ({
      setDamping: (value: number) => worker.setSpringDamping({ props: value, uuid }),
      setRestLength: (value: number) => worker.setSpringRestLength({ props: value, uuid }),
      setStiffness: (value: number) => worker.setSpringStiffness({ props: value, uuid }),
    }),
    deps,
  )

  return [refA, refB, api]
}

function useRay(
  mode: RayMode,
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  const { worker, events } = usePhysicsContext()
  const [uuid] = useState(() => MathUtils.generateUUID())
  useEffect(() => {
    events[uuid] = { rayhit: callback }
    worker.addRay({ props: { ...options, mode }, uuid })
    return () => {
      worker.removeRay({ uuid })
      delete events[uuid]
    }
  }, deps)
}

export function useRaycastClosest(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('Closest', options, callback, deps)
}

export function useRaycastAny(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('Any', options, callback, deps)
}

export function useRaycastAll(
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  useRay('All', options, callback, deps)
}

export interface RaycastVehiclePublicApi {
  applyEngineForce: (value: number, wheelIndex: number) => void
  setBrake: (brake: number, wheelIndex: number) => void
  setSteeringValue: (value: number, wheelIndex: number) => void
  sliding: {
    subscribe: (callback: (sliding: boolean) => void) => void
  }
}

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

export interface RaycastVehicleProps {
  chassisBody: Ref<Object3D>
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
  wheelInfos: WheelInfoOptions[]
  wheels: Ref<Object3D>[]
}

export function useRaycastVehicle<O extends Object3D>(
  fn: () => RaycastVehicleProps,
  fwdRef: Ref<O> = null,
  deps: DependencyList = [],
): [RefObject<O>, RaycastVehiclePublicApi] {
  const ref = useForwardedRef(fwdRef)
  const { worker, subscriptions } = usePhysicsContext()

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      // Yes, this type may be technically incorrect
      ref.current = new Object3D() as O
    }

    const currentWorker = worker
    const uuid: string = ref.current.uuid
    const {
      chassisBody,
      indexForwardAxis = 2,
      indexRightAxis = 0,
      indexUpAxis = 1,
      wheelInfos,
      wheels,
    } = fn()

    const chassisBodyUUID = getUUID(chassisBody)
    const wheelUUIDs = wheels.map((ref) => getUUID(ref))

    if (!chassisBodyUUID || !wheelUUIDs.every(isString)) return

    currentWorker.addRaycastVehicle({
      props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
      uuid,
    })
    return () => {
      currentWorker.removeRaycastVehicle({ uuid })
    }
  }, deps)

  const api = useMemo<RaycastVehiclePublicApi>(() => {
    return {
      applyEngineForce(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid &&
          worker.applyRaycastVehicleEngineForce({
            props: [value, wheelIndex],
            uuid,
          })
      },
      setBrake(brake: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.setRaycastVehicleBrake({ props: [brake, wheelIndex], uuid })
      },
      setSteeringValue(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid &&
          worker.setRaycastVehicleSteeringValue({
            props: [value, wheelIndex],
            uuid,
          })
      },
      sliding: {
        subscribe: subscribe(ref, worker, subscriptions, 'sliding', undefined, 'vehicles'),
      },
    }
  }, deps)
  return [ref, api]
}

export function useContactMaterial(
  materialA: MaterialOptions,
  materialB: MaterialOptions,
  options: ContactMaterialOptions,
  deps: DependencyList = [],
): void {
  const { worker } = usePhysicsContext()
  const [uuid] = useState(() => MathUtils.generateUUID())

  useEffect(() => {
    worker.addContactMaterial({
      props: [materialA, materialB, options],
      uuid,
    })
    return () => {
      worker.removeContactMaterial({ uuid })
    }
  }, deps)
}
