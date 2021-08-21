import type { MaterialOptions } from 'cannon-es'
import type { MutableRefObject } from 'react'
import type { Euler } from 'three'
import type {
  AddRayMessage,
  AtomicName,
  CannonWorker,
  CannonVectorName,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  Event,
  Events,
  RayMode,
  SetOpName,
  Subscriptions,
  SubscriptionName,
  SubscriptionTarget,
  VectorName,
} from './setup'
import { Object3D, InstancedMesh, DynamicDrawUsage, Vector3, MathUtils } from 'three'
import { useLayoutEffect, useContext, useRef, useMemo, useEffect, useState } from 'react'
import { context, debugContext } from './setup'

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

export type VectorProps = Record<VectorName, Triplet>

export type Triplet = [x: number, y: number, z: number]
type VectorTypes = Vector3 | Triplet

export type BodyProps<T = unknown> = Partial<AtomicProps> &
  Partial<VectorProps> & {
    args?: T
    type?: 'Dynamic' | 'Static' | 'Kinematic'
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
  }

export type BodyPropsArgsRequired<T = unknown> = BodyProps<T> & {
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
export type SphereProps = BodyProps<number>
export type TrimeshProps = BodyPropsArgsRequired<TrimeshArgs>
export type HeightfieldProps = BodyPropsArgsRequired<HeightfieldArgs>
export type ConvexPolyhedronProps = BodyProps<ConvexPolyhedronArgs>
export interface CompoundBodyProps extends BodyProps {
  shapes: BodyProps & { type: ShapeType }[]
}

export type AtomicApi = {
  [K in keyof AtomicProps]: {
    set: (value: AtomicProps[K]) => void
    subscribe: (callback: (value: AtomicProps[K]) => void) => () => void
  }
}

export type VectorApi = {
  [K in keyof VectorProps]: {
    set: (x: number, y: number, z: number) => void
    copy: ({ x, y, z }: Vector3 | Euler) => void
    subscribe: (callback: (value: Triplet) => void) => () => void
  }
}

export type WorkerApi = AtomicApi &
  VectorApi & {
    applyForce: (force: Triplet, worldPoint: Triplet) => void
    applyImpulse: (impulse: Triplet, worldPoint: Triplet) => void
    applyLocalForce: (force: Triplet, localPoint: Triplet) => void
    applyLocalImpulse: (impulse: Triplet, localPoint: Triplet) => void
    applyTorque: (torque: Triplet) => void
    wakeUp: () => void
    sleep: () => void
  }

export interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}
export type Api = [MutableRefObject<Object3D | null>, PublicApi]

export type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Lock'

export interface ConstraintOptns {
  maxForce?: number
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

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

function getUUID(ref: MutableRefObject<Object3D | null>, index?: number) {
  const suffix = index === undefined ? '' : `/${index}`
  return ref.current && `${ref.current.uuid}${suffix}`
}

function subscribe(
  ref: MutableRefObject<Object3D | null>,
  worker: CannonWorker,
  subscriptions: Subscriptions,
  type: SubscriptionName,
  index?: number,
  target: SubscriptionTarget = 'bodies',
) {
  return (callback: (value: any) => void) => {
    const id = subscriptionGuid++
    subscriptions[id] = callback
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
  events: Events,
  { onCollide, onCollideBegin, onCollideEnd }: Partial<BodyProps>,
  id: string,
) {
  if (onCollide || onCollideBegin || onCollideEnd) {
    events[id] = (ev: Event) => {
      switch (ev.type) {
        case 'collide':
          if (onCollide) onCollide(ev)
          break
        case 'collideBegin':
          if (onCollideBegin) onCollideBegin(ev)
          break
        case 'collideEnd':
          if (onCollideEnd) onCollideEnd(ev)
          break
      }
    }
  }
}

let subscriptionGuid = 0

type GetByIndex<T extends BodyProps> = (index: number) => T
type ArgFn<T> = (args: T) => unknown[]

function useBody<B extends BodyProps<unknown>>(
  type: BodyShapeType,
  fn: GetByIndex<B>,
  argsFn: ArgFn<B['args']>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps: any[] = [],
): Api {
  const localRef = useRef<Object3D | null>(null)
  const ref = fwdRef ? fwdRef : localRef
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
    const makeVec = (type: CannonVectorName, index?: number) => {
      const op: SetOpName<CannonVectorName> = `set${capitalize(type)}`
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
    const makeAtomic = (type: AtomicName, index?: number) => {
      const op: SetOpName<AtomicName> = `set${capitalize(type)}`
      return {
        set: (value: any) => {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op, props: value, uuid })
        },
        subscribe: subscribe(ref, worker, subscriptions, type, index),
      }
    }

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
        wakeUp() {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'wakeUp', uuid })
        },
        sleep() {
          const uuid = getUUID(ref, index)
          uuid && worker.postMessage({ op: 'sleep', uuid })
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

export function usePlane(
  fn: GetByIndex<PlaneProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}
export function useBox(fn: GetByIndex<BoxProps>, fwdRef?: MutableRefObject<Object3D | null>, deps?: any[]) {
  const defaultBoxArgs: Triplet = [1, 1, 1]
  return useBody('Box', fn, (args = defaultBoxArgs): Triplet => args, fwdRef, deps)
}
export function useCylinder(
  fn: GetByIndex<CylinderProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody('Cylinder', fn, (args = [] as []) => args, fwdRef, deps)
}
export function useHeightfield(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}
export function useParticle(
  fn: GetByIndex<ParticleProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}
export function useSphere(
  fn: GetByIndex<SphereProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody('Sphere', fn, (radius = 1): [number] => [radius], fwdRef, deps)
}
export function useTrimesh(
  fn: GetByIndex<TrimeshProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody<TrimeshProps>('Trimesh', fn, (args) => args, fwdRef, deps)
}

export function useConvexPolyhedron(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
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
  fwdRef?: MutableRefObject<Object3D | null>,
  deps?: any[],
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi = [
  MutableRefObject<Object3D | null>,
  MutableRefObject<Object3D | null>,
  {
    enable: () => void
    disable: () => void
  },
]

type HingeConstraintApi = [
  MutableRefObject<Object3D | null>,
  MutableRefObject<Object3D | null>,
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
  MutableRefObject<Object3D | null>,
  MutableRefObject<Object3D | null>,
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
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: any = {},
  deps: any[] = [],
): ConstraintORHingeApi<T> {
  const { worker } = useContext(context)
  const uuid = MathUtils.generateUUID()

  const nullRef1 = useRef<Object3D | null>(null)
  const nullRef2 = useRef<Object3D | null>(null)
  bodyA = bodyA === undefined || bodyA === null ? nullRef1 : bodyA
  bodyB = bodyB === undefined || bodyB === null ? nullRef2 : bodyB

  useEffect(() => {
    if (bodyA.current && bodyB.current) {
      worker.postMessage({
        op: 'addConstraint',
        props: [bodyA.current.uuid, bodyB.current.uuid, optns],
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

  return [bodyA, bodyB, api] as ConstraintORHingeApi<T>
}

export function usePointToPointConstraint(
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: PointToPointConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint(
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: ConeTwistConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint(
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: DistanceConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint(
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: HingeConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint(
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: LockConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: MutableRefObject<Object3D | null>,
  bodyB: MutableRefObject<Object3D | null>,
  optns: SpringOptns,
  deps: any[] = [],
): SpringApi {
  const { worker } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())

  const nullRef1 = useRef<Object3D>(null!)
  const nullRef2 = useRef<Object3D>(null!)
  bodyA = bodyA === undefined || bodyA === null ? nullRef1 : bodyA
  bodyB = bodyB === undefined || bodyB === null ? nullRef2 : bodyB

  useEffect(() => {
    if (bodyA.current && bodyB.current) {
      worker.postMessage({
        op: 'addSpring',
        uuid,
        props: [bodyA.current.uuid, bodyB.current.uuid, optns],
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

  return [bodyA, bodyB, api]
}

type RayOptions = Omit<AddRayMessage['props'], 'mode'>

function useRay(mode: RayMode, options: RayOptions, callback: (e: Event) => void, deps: any[] = []) {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => MathUtils.generateUUID())
  useEffect(() => {
    events[uuid] = callback
    worker.postMessage({ op: 'addRay', uuid, props: { mode, ...options } })
    return () => {
      worker.postMessage({ op: 'removeRay', uuid })
      delete events[uuid]
    }
  }, deps)
}

export function useRaycastClosest(options: RayOptions, callback: (e: Event) => void, deps: any[] = []) {
  useRay('Closest', options, callback, deps)
}

export function useRaycastAny(options: RayOptions, callback: (e: Event) => void, deps: any[] = []) {
  useRay('Any', options, callback, deps)
}

export function useRaycastAll(options: RayOptions, callback: (e: Event) => void, deps: any[] = []) {
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
  chassisBody: MutableRefObject<Object3D | null>
  wheels: MutableRefObject<Object3D | null>[]
  wheelInfos: WheelInfoOptions[]
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
}

export function useRaycastVehicle(
  fn: () => RaycastVehicleProps,
  fwdRef?: MutableRefObject<Object3D | null>,
  deps: any[] = [],
): [MutableRefObject<Object3D | null>, RaycastVehiclePublicApi] {
  const ref = fwdRef ? fwdRef : useRef<Object3D | null>(null)
  const { worker, subscriptions } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new Object3D()
    }

    const currentWorker = worker
    const uuid: string[] = [ref.current.uuid]
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
