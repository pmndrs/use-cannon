import type { MaterialOptions, RayOptions } from 'cannon-es'
import type {
  Buffers,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  Event,
  Events,
  Subscriptions,
} from './setup'
import * as THREE from 'three'
import React, {
  useLayoutEffect,
  useContext,
  useRef,
  useMemo,
  useEffect,
  useState,
  MutableRefObject,
} from 'react'
import { useFrame } from '@react-three/fiber'
import { context, debugContext } from './setup'

export interface AtomicProps {
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
  userData?: object
  isTrigger?: boolean
}

export type Triplet = [x: number, y: number, z: number]
type VectorTypes = THREE.Vector3 | Triplet

export interface BodyProps<T = unknown> extends AtomicProps {
  args?: T
  position?: Triplet
  rotation?: Triplet
  velocity?: Triplet
  angularVelocity?: Triplet
  linearFactor?: Triplet
  angularFactor?: Triplet
  type?: 'Dynamic' | 'Static' | 'Kinematic'
  onCollide?: (e: CollideEvent) => void
  onCollideBegin?: (e: CollideBeginEvent) => void
  onCollideEnd?: (e: CollideEndEvent) => void
}

export interface BodyPropsArgsRequired<T = unknown> extends BodyProps<T> {
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
export type TrimeshArgs = [vertices: number[], indices: number[]]
export type HeightfieldArgs = [
  data: number[][],
  options: { elementSize?: number; maxValue?: number; minValue?: number; },
]
export type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
  vertices?: V[],
  faces?: number[][],
  normals?: V[],
  axes?: V[],
  boundingSphereRadius?: number
]

export interface PlaneProps extends BodyProps {}
export interface BoxProps extends BodyProps<Triplet> {}
export interface CylinderProps extends BodyProps<CylinderArgs> {}
export interface ParticleProps extends BodyProps {}
export interface SphereProps extends BodyProps<number> {}
export interface TrimeshProps extends BodyPropsArgsRequired<TrimeshArgs> {}
export interface HeightfieldProps extends BodyPropsArgsRequired<HeightfieldArgs> {}
export interface ConvexPolyhedronProps extends BodyProps<ConvexPolyhedronArgs> {}
export interface CompoundBodyProps extends BodyProps {
  shapes: BodyProps & { type: ShapeType }[]
}

interface WorkerVec {
  set: (x: number, y: number, z: number) => void
  copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) => void
  subscribe: (callback: (value: Triplet) => void) => void
}

export type WorkerProps<T> = {
  [K in keyof T]: {
    set: (value: T[K]) => void
    subscribe: (callback: (value: T[K]) => void) => () => void
  }
}
export interface WorkerApi extends WorkerProps<AtomicProps> {
  position: WorkerVec
  rotation: WorkerVec
  velocity: WorkerVec
  angularVelocity: WorkerVec
  linearFactor: WorkerVec
  angularFactor: WorkerVec
  applyForce: (force: Triplet, worldPoint: Triplet) => void
  applyImpulse: (impulse: Triplet, worldPoint: Triplet) => void
  applyLocalForce: (force: Triplet, localPoint: Triplet) => void
  applyLocalImpulse: (impulse: Triplet, localPoint: Triplet) => void
}

interface PublicApi extends WorkerApi {
  at: (index: number) => WorkerApi
}
export type Api = [React.MutableRefObject<THREE.Object3D | undefined>, PublicApi]

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

export interface LockConstraintOpts extends ConstraintOptns {}

export interface SpringOptns {
  restLength?: number
  stiffness?: number
  damping?: number
  worldAnchorA?: Triplet
  worldAnchorB?: Triplet
  localAnchorA?: Triplet
  localAnchorB?: Triplet
}

const temp = new THREE.Object3D()

function opString(action: string, type: string) {
  return action + type.charAt(0).toUpperCase() + type.slice(1)
}

function getUUID(ref: MutableRefObject<THREE.Object3D>, index?: number) {
  return index !== undefined ? `${ref.current.uuid}/${index}` : ref.current.uuid
}

function post(
  ref: MutableRefObject<THREE.Object3D>,
  worker: Worker,
  op: string,
  index?: number,
  props?: any,
) {
  return ref.current && worker.postMessage({ op, uuid: getUUID(ref, index), props })
}

function subscribe(
  ref: MutableRefObject<THREE.Object3D>,
  worker: Worker,
  subscriptions: Subscriptions,
  type: string,
  index?: number,
  target?: string,
) {
  return (callback: (value: any) => void) => {
    const id = subscriptionGuid++
    subscriptions[id] = callback
    post(ref, worker, 'subscribe', index, {
      id,
      type,
      target: target === undefined || target === null ? 'bodies' : target,
    })
    return () => {
      delete subscriptions[id]
      worker.postMessage({ op: 'unsubscribe', props: id })
    }
  }
}

function prepare(object: THREE.Object3D, props: BodyProps) {
  object.userData = props.userData || {}
  object.position.set(...(props.position || [0, 0, 0]))
  object.rotation.set(...(props.rotation || [0, 0, 0]))
}

function apply(object: THREE.Object3D, index: number, buffers: Buffers) {
  if (index !== undefined) {
    object.position.fromArray(buffers.positions, index * 3)
    object.quaternion.fromArray(buffers.quaternions, index * 4)
  }
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
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps: any[] = [],
): Api {
  const localRef = useRef<THREE.Object3D>(null!)
  const ref = fwdRef ? fwdRef : localRef
  const { worker, bodies, buffers, refs, events, subscriptions } = useContext(context)
  const debugApi = useContext(debugContext)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new THREE.Object3D()
    }

    const object = ref.current
    const currentWorker = worker

    const objectCount =
      object instanceof THREE.InstancedMesh
        ? (object.instanceMatrix.setUsage(THREE.DynamicDrawUsage), object.count)
        : 1

    const uuid =
      object instanceof THREE.InstancedMesh
        ? new Array(objectCount).fill(0).map((_, i) => `${object.uuid}/${i}`)
        : [object.uuid]

    const props: (B & { args: unknown })[] =
      object instanceof THREE.InstancedMesh
        ? uuid.map((id, i) => {
            // Why? Because @mrdoob did it in his example ...
            const props = fn(i)
            prepare(temp, props)
            temp.updateMatrix()
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
      props.forEach((props, index) => {
        delete refs[uuid[index]]
        if (debugApi) {
          debugApi.remove(uuid[index])
        }
        if (props.onCollide || props.onCollideBegin || props.onCollideEnd) delete events[uuid[index]]
      })
      currentWorker.postMessage({ op: 'removeBodies', uuid })
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  // Run loop *before* the main loop in the provider!
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
  }, -2)

  const api = useMemo(() => {
    const makeVec = (type: string, index?: number) => ({
      set: (x: number, y: number, z: number) => post(ref, worker, opString('set', type), index, [x, y, z]),
      copy: ({ x, y, z }: THREE.Vector3 | THREE.Euler) =>
        post(ref, worker, opString('set', type), index, [x, y, z]),
      subscribe: subscribe(ref, worker, subscriptions, type, index),
    })
    const makeAtomic = (type: string, index?: number) => ({
      set: (value: any) => post(ref, worker, opString('set', type), index, value),
      subscribe: subscribe(ref, worker, subscriptions, type, index),
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
        userData: makeAtomic('userData', index),
        isTrigger: makeAtomic('isTrigger', index),
        // Apply functions
        applyForce(force: Triplet, worldPoint: Triplet) {
          post(ref, worker, 'applyForce', index, [force, worldPoint])
        },
        applyImpulse(impulse: Triplet, worldPoint: Triplet) {
          post(ref, worker, 'applyImpulse', index, [impulse, worldPoint])
        },
        applyLocalForce(force: Triplet, localPoint: Triplet) {
          post(ref, worker, 'applyLocalForce', index, [force, localPoint])
        },
        applyLocalImpulse(impulse: Triplet, localPoint: Triplet) {
          post(ref, worker, 'applyLocalImpulse', index, [impulse, localPoint])
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

function makeTriplet(v: THREE.Vector3 | Triplet): Triplet {
  return v instanceof THREE.Vector3 ? [v.x, v.y, v.z] : v
}

export function usePlane(
  fn: GetByIndex<PlaneProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody('Plane', fn, () => [], fwdRef, deps)
}
export function useBox(
  fn: GetByIndex<BoxProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  const defaultBoxArgs: Triplet = [1, 1, 1]
  return useBody('Box', fn, (args = defaultBoxArgs): Triplet => args, fwdRef, deps)
}
export function useCylinder(
  fn: GetByIndex<CylinderProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody('Cylinder', fn, (args = [] as []) => args, fwdRef, deps)
}
export function useHeightfield(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody('Heightfield', fn, (args) => args, fwdRef, deps)
}
export function useParticle(
  fn: GetByIndex<ParticleProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody('Particle', fn, () => [], fwdRef, deps)
}
export function useSphere(
  fn: GetByIndex<SphereProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody(
    'Sphere',
    fn,
    (radius = 1): [number] => [radius],
    fwdRef,
    deps,
  )
}
export function useTrimesh(
  fn: GetByIndex<TrimeshProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody<TrimeshProps>(
    'Trimesh',
    fn,
    (args) => args,
    fwdRef,
    deps,
  )
}

export function useConvexPolyhedron(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
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
      boundingSphereRadius
    ],
    fwdRef,
    deps,
  )
}
export function useCompoundBody(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
) {
  return useBody('Compound', fn, (args) => args as unknown[], fwdRef, deps)
}

type ConstraintApi = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  React.MutableRefObject<THREE.Object3D | undefined>,
  {
    enable: () => void
    disable: () => void
  },
]

type HingeConstraintApi = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  React.MutableRefObject<THREE.Object3D | undefined>,
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
  React.MutableRefObject<THREE.Object3D | undefined>,
  React.MutableRefObject<THREE.Object3D | undefined>,
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
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: any = {},
  deps: any[] = [],
): ConstraintORHingeApi<T> {
  const { worker } = useContext(context)
  const uuid = THREE.MathUtils.generateUUID()

  const nullRef1 = useRef<THREE.Object3D>(null!)
  const nullRef2 = useRef<THREE.Object3D>(null!)
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
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: PointToPointConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('PointToPoint', bodyA, bodyB, optns, deps)
}
export function useConeTwistConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: ConeTwistConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('ConeTwist', bodyA, bodyB, optns, deps)
}
export function useDistanceConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: DistanceConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('Distance', bodyA, bodyB, optns, deps)
}
export function useHingeConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: HingeConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('Hinge', bodyA, bodyB, optns, deps)
}
export function useLockConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: LockConstraintOpts,
  deps: any[] = [],
) {
  return useConstraint('Lock', bodyA, bodyB, optns, deps)
}

export function useSpring(
  bodyA: React.MutableRefObject<THREE.Object3D | undefined>,
  bodyB: React.MutableRefObject<THREE.Object3D | undefined>,
  optns: SpringOptns,
  deps: any[] = [],
): SpringApi {
  const { worker, events } = useContext(context)
  const [uuid] = useState(() => THREE.MathUtils.generateUUID())

  const nullRef1 = useRef<THREE.Object3D>(null!)
  const nullRef2 = useRef<THREE.Object3D>(null!)
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

type RayOptns = Omit<RayOptions, 'mode' | 'from' | 'to' | 'result' | 'callback'> & {
  from?: Triplet
  to?: Triplet
}

function useRay(
  mode: 'Closest' | 'Any' | 'All',
  options: RayOptns,
  callback: (e: Event) => void,
  deps: any[] = [],
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
  frictionSlip?: number
  rollInfluence?: number
  axleLocal?: Triplet
  chassisConnectionPointLocal?: Triplet
  isFrontWheel?: boolean
  useCustomSlidingRotationalSpeed?: boolean
  customSlidingRotationalSpeed?: number
}

export interface RaycastVehicleProps {
  chassisBody: React.MutableRefObject<THREE.Object3D | undefined>
  wheels: React.MutableRefObject<THREE.Object3D | undefined>[]
  wheelInfos: WheelInfoOptions[]
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
}

export function useRaycastVehicle(
  fn: () => RaycastVehicleProps,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps: any[] = [],
): [React.MutableRefObject<THREE.Object3D | undefined>, RaycastVehiclePublicApi] {
  const ref = fwdRef ? fwdRef : useRef<THREE.Object3D>(null!)
  const { worker, subscriptions } = useContext(context)

  useLayoutEffect(() => {
    if (!ref.current) {
      // When the reference isn't used we create a stub
      // The body doesn't have a visual representation but can still be constrained
      ref.current = new THREE.Object3D()
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
    const post = (op: string, props?: any) =>
      ref.current && worker.postMessage({ op, uuid: ref.current.uuid, props })
    return {
      sliding: {
        subscribe: subscribe(ref, worker, subscriptions, 'sliding', undefined, 'vehicles'),
      },
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
  }, deps)
  return [ref, api]
}
