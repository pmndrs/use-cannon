import { useLayoutEffect, useContext, useRef, useMemo, useEffect, useState } from 'react'
import { DynamicDrawUsage, Euler, InstancedMesh, MathUtils, Object3D, Quaternion, Vector3 } from 'three'
import { context, debugContext } from './setup'

import type { MaterialOptions } from 'cannon-es'
import type { DependencyList, MutableRefObject, Ref, RefObject } from 'react'
import type {
  AddRayMessage,
  AtomicName,
  CannonWorker,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  PropValue,
  ProviderContext,
  RayhitEvent,
  RayMode,
  SetOpName,
  SubscriptionName,
  SubscriptionTarget,
  VectorName,
} from './setup'

export type AtomicProps = {
  allowSleep: boolean
  angularDamping: number
  collisionFilterGroup: number
  collisionFilterMask: number
  collisionResponse: number
  fixedRotation: boolean
  isTrigger: boolean
  linearDamping: number
  mass: number
  material: MaterialOptions
  sleepSpeedLimit: number
  sleepTimeLimit: number
  userData: {}
}

export type Triplet = [x: number, y: number, z: number]

export type VectorProps = Record<VectorName, Triplet>
type VectorTypes = Vector3 | Triplet

export type Quad = [x: number, y: number, z: number, w: number]

export type BodyProps<T extends any[] = unknown[]> = Partial<AtomicProps> &
  Partial<VectorProps> & {
    args?: T
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
    quaternion?: Quad
    rotation?: Triplet
    type?: 'Dynamic' | 'Static' | 'Kinematic'
  }

export type BodyPropsArgsRequired<T extends any[] = unknown[]> = BodyProps<T> & {
  args: T
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

export type CylinderArgs = [radiusTop?: number, radiusBottom?: number, height?: number, numSegments?: number]
export type SphereArgs = [radius: number]
export type TrimeshArgs = [vertices: ArrayLike<number>, indices: ArrayLike<number>]
export type HeightfieldArgs = [
  data: number[][],
  options: { elementSize?: number; maxValue?: number; minValue?: number },
]
export type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
  vertices?: V[],
  faces?: number[][],
  normals?: V[],
  axes?: V[],
  boundingSphereRadius?: number,
]

export type PlaneProps = BodyProps
export type BoxProps = BodyProps<Triplet>
export type CylinderProps = BodyProps<CylinderArgs>
export type ParticleProps = BodyProps
export type SphereProps = BodyProps<SphereArgs>
export type TrimeshProps = BodyPropsArgsRequired<TrimeshArgs>
export type HeightfieldProps = BodyPropsArgsRequired<HeightfieldArgs>
export type ConvexPolyhedronProps = BodyProps<ConvexPolyhedronArgs>
export interface CompoundBodyProps extends BodyProps {
  shapes: BodyProps & { type: ShapeType }[]
}

export type AtomicApi<K extends AtomicName> = {
  set: (value: AtomicProps[K]) => void
  subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
}

export type QuaternionApi = {
  set: (x: number, y: number, z: number, w: number) => void
  copy: ({ w, x, y, z }: Quaternion) => void
  subscribe: (callback: (value: Quad) => void) => () => void
}

export type VectorApi = {
  set: (x: number, y: number, z: number) => void
  copy: ({ x, y, z }: Vector3 | Euler) => void
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
  sleep: () => void
  wakeUp: () => void
}

export interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}
export type Api = [RefObject<Object3D>, PublicApi]

export type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Lock'

export interface ConstraintOptns {
  maxForce?: number
  maxMultiplier?: number
  collideConnected?: boolean
  wakeUpBodies?: boolean
}

export interface PointToPointConstraintOpts extends ConstraintOptns {
  pivotA: Triplet
  pivotB: Triplet
}

export interface ConeTwistConstraintOpts extends ConstraintOptns {
  pivotA?: Triplet
  axisA?: Triplet
  pivotB?: Triplet
  axisB?: Triplet
  angle?: number
  twistAngle?: number
}
export interface DistanceConstraintOpts extends ConstraintOptns {
  distance?: number
}

export interface HingeConstraintOpts extends ConstraintOptns {
  pivotA?: Triplet
  axisA?: Triplet
  pivotB?: Triplet
  axisB?: Triplet
}

export type LockConstraintOpts = ConstraintOptns

export interface SpringOptns {
  restLength?: number
  stiffness?: number
  damping?: number
  worldAnchorA?: Triplet
  worldAnchorB?: Triplet
  localAnchorA?: Triplet
  localAnchorB?: Triplet
}

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
  worker: CannonWorker,
  subscriptions: ProviderContext['subscriptions'],
  type: T,
  index?: number,
  target: SubscriptionTarget = 'bodies',
) {
  return (callback: (value: PropValue<T>) => void) => {
    const id = incrementingId++
    subscriptions[id] = { [type]: callback }
    const uuid = getUUID(ref, index)
    uuid && worker.postMessage({ op: 'subscribe', uuid, props: { id, type, target } })
    return () => {
      delete subscriptions[id]
      worker.postMessage({ op: 'unsubscribe', props: id })
    }
  }
}

function prepare(object: Object3D, props: BodyProps) {
  object.userData = props.userData || {}
  object.position.set(...(props.position || [0, 0, 0]))
  object.rotation.set(...(props.rotation || [0, 0, 0]))
  object.updateMatrix()
}

function setupCollision(
  events: ProviderContext['events'],
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

function useBody<B extends BodyProps<unknown[]>>(
  type: BodyShapeType,
  fn: GetByIndex<B>,
  argsFn: ArgFn<B['args']>,
  fwdRef: Ref<Object3D>,
  deps: DependencyList = [],
): Api {
  const ref = useForwardedRef(fwdRef)
  const { worker, refs, events, subscriptions } = useContext(context)
  const debugApi = useContext(debugContext)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
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
            if (debugApi) debugApi.add(id, props, type)
            setupCollision(events, props, id)
            return { ...props, args: argsFn(props.args) }
          })
        : uuid.map((id, i) => {
            const props = fn(i)
            prepare(object, props)
            refs[id] = object
            if (debugApi) debugApi.add(id, props, type)
            setupCollision(events, props, id)
            return { ...props, args: argsFn(props.args) }
          })

    // Register on mount, unregister on unmount
    currentWorker.postMessage({
      op: 'addBodies',
      type,
      uuid,
      props: props.map(({ onCollide, onCollideBegin, onCollideEnd, ...serializableProps }) => {
        return { onCollide: Boolean(onCollide), ...serializableProps }
      }),
    })
    return () => {
      uuid.forEach((id) => {
        delete refs[id]
        if (debugApi) debugApi.remove(id)
        delete events[id]
      })
      currentWorker.postMessage({ op: 'removeBodies', uuid })
    }
  }, deps)

  const api = useMemo(() => {
    const makeAtomic = <T extends AtomicName>(type: T, index?: number) => {
      const op: SetOpName<T> = `set${capitalize(type)}`
      return {
        set: (value: PropValue<T>) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: value, uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    const makeQuaternion = (index?: number) => {
      const op = 'setQuaternion'
      const type = 'quaternion'
      return {
        set: (x: number, y: number, z: number, w: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: [x, y, z, w], uuid })
        },
        copy: ({ w, x, y, z }: Quaternion) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: [x, y, z, w], uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    const makeRotation = (index?: number) => {
      const op = 'setRotation'
      return {
        set: (x: number, y: number, z: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: [x, y, z], uuid })
        },
        copy: ({ x, y, z }: Vector3 | Euler) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: [x, y, z], uuid })
        },
        subscribe: (callback: (value: Triplet) => void) => {
          const id = incrementingId++
          const target = 'bodies'
          const type = 'quaternion'
          const uuid = getUUID(ref, index)

          subscriptions[id] = { [type]: quaternionToRotation(callback) }
          uuid && worker.postMessage({ op: 'subscribe', uuid, props: { id, type, target } })
          return () => {
            delete subscriptions[id]
            worker.postMessage({ op: 'unsubscribe', props: id })
          }
        },
      }
    }

    const makeVec = (type: VectorName, index?: number) => {
      const op: SetOpName<VectorName> = `set${capitalize(type)}`
      return {
        set: (x: number, y: number, z: number) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: [x, y, z], uuid })
        },
        copy: ({ x, y, z }: Vector3 | Euler) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: [x, y, z], uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

    function makeApi(index?: number): WorkerApi {
      return {
        angularFactor: makeVec('angularFactor', index),
        angularVelocity: makeVec('angularVelocity', index),
        linearFactor: makeVec('linearFactor', index),
        position: makeVec('position', index),
        quaternion: makeQuaternion(index),
        rotation: makeRotation(index),
        velocity: makeVec('velocity', index),
        allowSleep: makeAtomic('allowSleep', index),
        angularDamping: makeAtomic('angularDamping', index),
        collisionFilterGroup: makeAtomic('collisionFilterGroup', index),
        collisionFilterMask: makeAtomic('collisionFilterMask', index),
        collisionResponse: makeAtomic('collisionResponse', index),
        isTrigger: makeAtomic('isTrigger', index),
        fixedRotation: makeAtomic('fixedRotation', index),
        linearDamping: makeAtomic('linearDamping', index),
        mass: makeAtomic('mass', index),
        material: makeAtomic('material', index),
        sleepSpeedLimit: makeAtomic('sleepSpeedLimit', index),
        sleepTimeLimit: makeAtomic('sleepTimeLimit', index),
        userData: makeAtomic('userData', index),
        // Apply functions
        applyForce(force: Triplet, worldPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'applyForce', props: [force, worldPoint], uuid })
        },
        applyImpulse(impulse: Triplet, worldPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'applyImpulse', props: [impulse, worldPoint], uuid })
        },
        applyLocalForce(force: Triplet, localPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'applyLocalForce', props: [force, localPoint], uuid })
        },
        applyLocalImpulse(impulse: Triplet, localPoint: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'applyLocalImpulse', props: [impulse, localPoint], uuid })
        },
        applyTorque(torque: Triplet) {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'applyTorque', props: [torque], uuid })
        },
        // force particular sleep state
        sleep() {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'sleep', uuid })
        },
        wakeUp() {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'wakeUp', uuid })
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

export function usePlane(fn: GetByIndex<PlaneProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}
export function useBox(fn: GetByIndex<BoxProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
  const defaultBoxArgs: Triplet = [1, 1, 1]
  return useBody('Box', fn, (args = defaultBoxArgs): Triplet => args, fwdRef, deps)
}
export function useCylinder(
  fn: GetByIndex<CylinderProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Cylinder', fn, (args = [] as []) => args, fwdRef, deps)
}
export function useHeightfield(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}
export function useParticle(
  fn: GetByIndex<ParticleProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}
export function useSphere(fn: GetByIndex<SphereProps>, fwdRef: Ref<Object3D> = null, deps?: DependencyList) {
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
export function useTrimesh(
  fn: GetByIndex<TrimeshProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody<TrimeshProps>('Trimesh', fn, (args) => args, fwdRef, deps)
}

export function useConvexPolyhedron(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody<ConvexPolyhedronProps>(
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
export function useCompoundBody(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef: Ref<Object3D> = null,
  deps?: DependencyList,
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    enable: () => void
    disable: () => void
  },
]

type HingeConstraintApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    enable: () => void
    disable: () => void
    enableMotor: () => void
    disableMotor: () => void
    setMotorSpeed: (value: number) => void
    setMotorMaxForce: (value: number) => void
  },
]

type SpringApi = [
  RefObject<Object3D>,
  RefObject<Object3D>,
  {
    setStiffness: (value: number) => void
    setRestLength: (value: number) => void
    setDamping: (value: number) => void
  },
]

type ConstraintORHingeApi<T extends 'Hinge' | ConstraintTypes> = T extends ConstraintTypes
  ? ConstraintApi
  : HingeConstraintApi

function useConstraint<T extends 'Hinge' | ConstraintTypes>(
  type: T,
  bodyA: Ref<Object3D>,
  bodyB: Ref<Object3D>,
  optns: any = {},
  deps: DependencyList = [],
): ConstraintORHingeApi<T> {
  const { worker } = useContext(context)
  const uuid = MathUtils.generateUUID()

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.postMessage({
        op: 'addConstraint',
        props: [refA.current.uuid, refB.current.uuid, optns],
        type,
        uuid,
      })
      return () => worker.postMessage({ op: 'removeConstraint', uuid })
    }
  }, deps)

  const api = useMemo(() => {
    const enableDisable = {
      enable: () => worker.postMessage({ op: 'enableConstraint', uuid }),
      disable: () => worker.postMessage({ op: 'disableConstraint', uuid }),
    }

    if (type === 'Hinge') {
      return {
        ...enableDisable,
        enableMotor: () => worker.postMessage({ op: 'enableConstraintMotor', uuid }),
        disableMotor: () => worker.postMessage({ op: 'disableConstraintMotor', uuid }),
        setMotorSpeed: (value: number) =>
          worker.postMessage({ op: 'setConstraintMotorSpeed', uuid, props: value }),
        setMotorMaxForce: (value: number) =>
          worker.postMessage({ op: 'setConstraintMotorMaxForce', uuid, props: value }),
      }
    }

    return enableDisable
  }, deps)

  return [refA, refB, api] as ConstraintORHingeApi<T>
}

export function usePointToPointConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: PointToPointConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: ConeTwistConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: DistanceConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: HingeConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: LockConstraintOpts,
  deps: DependencyList = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: Ref<Object3D> = null,
  bodyB: Ref<Object3D> = null,
  optns: SpringOptns,
  deps: DependencyList = [],
): SpringApi {
  const { worker } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())

  const refA = useForwardedRef(bodyA)
  const refB = useForwardedRef(bodyB)

  useEffect(() => {
    if (refA.current && refB.current) {
      worker.postMessage({
        op: 'addSpring',
        uuid,
        props: [refA.current.uuid, refB.current.uuid, optns],
      })
      return () => {
        worker.postMessage({ op: 'removeSpring', uuid })
      }
    }
  }, deps)

  const api = useMemo(
    () => ({
      setStiffness: (value: number) => worker.postMessage({ op: 'setSpringStiffness', props: value, uuid }),
      setRestLength: (value: number) => worker.postMessage({ op: 'setSpringRestLength', props: value, uuid }),
      setDamping: (value: number) => worker.postMessage({ op: 'setSpringDamping', props: value, uuid }),
    }),
    deps,
  )

  return [refA, refB, api]
}

type RayOptions = Omit<AddRayMessage['props'], 'mode'>

function useRay(
  mode: RayMode,
  options: RayOptions,
  callback: (e: RayhitEvent) => void,
  deps: DependencyList = [],
) {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())
  useEffect(() => {
    events[uuid] = { rayhit: callback }
    worker.postMessage({ op: 'addRay', uuid, props: { mode, ...options } })
    return () => {
      worker.postMessage({ op: 'removeRay', uuid })
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

export interface WheelInfoOptions {
  radius?: number
  directionLocal?: Triplet
  suspensionStiffness?: number
  suspensionRestLength?: number
  maxSuspensionForce?: number
  maxSuspensionTravel?: number
  dampingRelaxation?: number
  dampingCompression?: number
  sideAcceleration?: number
  frictionSlip?: number
  rollInfluence?: number
  axleLocal?: Triplet
  chassisConnectionPointLocal?: Triplet
  isFrontWheel?: boolean
  useCustomSlidingRotationalSpeed?: boolean
  customSlidingRotationalSpeed?: number
}

export interface RaycastVehicleProps {
  chassisBody: Ref<Object3D>
  wheels: Ref<Object3D>[]
  wheelInfos: WheelInfoOptions[]
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
}

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

export function useRaycastVehicle(
  fn: () => RaycastVehicleProps,
  fwdRef: Ref<Object3D> = null,
  deps: DependencyList = [],
): [RefObject<Object3D>, RaycastVehiclePublicApi] {
  const ref = useForwardedRef(fwdRef)
  const { worker, subscriptions } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const currentWorker = worker
    const uuid: string[] = [ref.current.uuid]
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

    currentWorker.postMessage({
      op: 'addRaycastVehicle',
      uuid,
      props: [chassisBodyUUID, wheelUUIDs, wheelInfos, indexForwardAxis, indexRightAxis, indexUpAxis],
    })
    return () => {
      currentWorker.postMessage({ op: 'removeRaycastVehicle', uuid })
    }
  }, deps)

  const api = useMemo<RaycastVehiclePublicApi>(() => {
    return {
      sliding: {
        subscribe: subscribe(ref, worker, subscriptions, 'sliding', undefined, 'vehicles'),
      },
      setSteeringValue(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.postMessage({ op: 'setRaycastVehicleSteeringValue', props: [value, wheelIndex], uuid })
      },
      applyEngineForce(value: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.postMessage({ op: 'applyRaycastVehicleEngineForce', props: [value, wheelIndex], uuid })
      },
      setBrake(brake: number, wheelIndex: number) {
        const uuid = getUUID(ref)
        uuid && worker.postMessage({ op: 'setRaycastVehicleBrake', props: [brake, wheelIndex], uuid })
      },
    }
  }, deps)
  return [ref, api]
}
