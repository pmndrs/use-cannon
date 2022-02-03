import type {
  ContactMaterial,
  ContactMaterialOptions,
  MaterialOptions,
  RayOptions as RayOptionsImpl,
  Shape,
} from 'cannon-es'
import type { MutableRefObject } from 'react'
import { createContext } from 'react'
import type { Object3D } from 'three'
import type { CannonWorker } from 'worker/cannon-worker'

import type { AtomicProps, BodyProps, BodyShapeType } from './hooks'

export type Triplet = [x: number, y: number, z: number]
export type Quad = [x: number, y: number, z: number, w: number]

export type Broadphase = 'Naive' | 'SAP'
export type Solver = 'GS' | 'Split'
export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }

export type ConstraintTypes = 'PointToPoint' | 'ConeTwist' | 'Distance' | 'Lock'

export interface ConstraintOptns {
  collideConnected?: boolean
  maxForce?: number
  maxMultiplier?: number
  wakeUpBodies?: boolean
}

export interface PointToPointConstraintOpts extends ConstraintOptns {
  pivotA: Triplet
  pivotB: Triplet
}

export interface ConeTwistConstraintOpts extends ConstraintOptns {
  angle?: number
  axisA?: Triplet
  axisB?: Triplet
  pivotA?: Triplet
  pivotB?: Triplet
  twistAngle?: number
}
export interface DistanceConstraintOpts extends ConstraintOptns {
  distance?: number
}

export interface HingeConstraintOpts extends ConstraintOptns {
  axisA?: Triplet
  axisB?: Triplet
  pivotA?: Triplet
  pivotB?: Triplet
}

export type LockConstraintOpts = ConstraintOptns

export interface SpringOptns {
  damping?: number
  localAnchorA?: Triplet
  localAnchorB?: Triplet
  restLength?: number
  stiffness?: number
  worldAnchorA?: Triplet
  worldAnchorB?: Triplet
}

export type RayOptions = Omit<AddRayMessage['props'], 'mode'>

export interface WheelInfoOptions {
  axleLocal?: Triplet
  chassisConnectionPointLocal?: Triplet
  customSlidingRotationalSpeed?: number
  dampingCompression?: number
  dampingRelaxation?: number
  directionLocal?: Triplet
  frictionSlip?: number
  isFrontWheel?: boolean
  maxSuspensionForce?: number
  maxSuspensionTravel?: number
  radius?: number
  rollInfluence?: number
  sideAcceleration?: number
  suspensionRestLength?: number
  suspensionStiffness?: number
  useCustomSlidingRotationalSpeed?: boolean
}

type WorkerContact = WorkerCollideEvent['data']['contact']
export type CollideEvent = Omit<WorkerCollideEvent['data'], 'body' | 'target' | 'contact'> & {
  body: Object3D
  contact: Omit<WorkerContact, 'bi' | 'bj'> & {
    bi: Object3D
    bj: Object3D
  }
  target: Object3D
}
export type CollideBeginEvent = {
  body: Object3D
  op: 'event'
  target: Object3D
  type: 'collideBegin'
}
export type CollideEndEvent = {
  body: Object3D
  op: 'event'
  target: Object3D
  type: 'collideEnd'
}
export type RayhitEvent = Omit<WorkerRayhitEvent['data'], 'body'> & { body: Object3D | null }

type CannonEvent = CollideBeginEvent | CollideEndEvent | CollideEvent | RayhitEvent
type CallbackByType<T extends { type: string }> = {
  [K in T['type']]?: T extends { type: K } ? (e: T) => void : never
}

type CannonEvents = { [uuid: string]: Partial<CallbackByType<CannonEvent>> }

export type Subscription = Partial<{ [K in SubscriptionName]: (value: PropValue<K>) => void }>
export type Subscriptions = Partial<{
  [id: number]: Subscription
}>

export type PropValue<T extends SubscriptionName = SubscriptionName> = T extends AtomicName
  ? AtomicProps[T]
  : T extends VectorName
  ? Triplet
  : T extends 'quaternion'
  ? Quad
  : T extends 'sliding'
  ? boolean
  : never

export const atomicNames = [
  'allowSleep',
  'angularDamping',
  'collisionFilterGroup',
  'collisionFilterMask',
  'collisionResponse',
  'fixedRotation',
  'isTrigger',
  'linearDamping',
  'mass',
  'material',
  'sleepSpeedLimit',
  'sleepTimeLimit',
  'userData',
] as const
export type AtomicName = typeof atomicNames[number]

export const vectorNames = [
  'angularFactor',
  'angularVelocity',
  'linearFactor',
  'position',
  'velocity',
] as const
export type VectorName = typeof vectorNames[number]

export const subscriptionNames = [...atomicNames, ...vectorNames, 'quaternion', 'sliding'] as const
export type SubscriptionName = typeof subscriptionNames[number]

export type SetOpName<T extends AtomicName | VectorName | WorldPropName | 'quaternion' | 'rotation'> =
  `set${Capitalize<T>}`

type Operation<T extends string, P> = { op: T } & (P extends null ? {} : { props: P })
type WithUUID<T extends string, P = null> = Operation<T, P> & { uuid: string }
type WithUUIDs<T extends string, P = null> = Operation<T, P> & { uuid: string[] }

export type AddConstraintMessage = WithUUID<'addConstraint', [uuidA: string, uuidB: string, options: {}]> & {
  type: 'Hinge' | ConstraintTypes
}
export type DisableConstraintMessage = WithUUID<'disableConstraint'>
export type EnableConstraintMessage = WithUUID<'enableConstraint'>
export type RemoveConstraintMessage = WithUUID<'removeConstraint'>

type ConstraintMessage =
  | AddConstraintMessage
  | DisableConstraintMessage
  | EnableConstraintMessage
  | RemoveConstraintMessage

export type DisableConstraintMotorMessage = WithUUID<'disableConstraintMotor'>
export type EnableConstraintMotorMessage = WithUUID<'enableConstraintMotor'>
export type SetConstraintMotorMaxForce = WithUUID<'setConstraintMotorMaxForce', number>
export type SetConstraintMotorSpeed = WithUUID<'setConstraintMotorSpeed', number>

type ConstraintMotorMessage =
  | DisableConstraintMotorMessage
  | EnableConstraintMotorMessage
  | SetConstraintMotorSpeed
  | SetConstraintMotorMaxForce

export type AddSpringMessage = WithUUID<'addSpring', [uuidA: string, uuidB: string, options: SpringOptns]>
export type RemoveSpringMessage = WithUUID<'removeSpring'>

export type SetSpringDampingMessage = WithUUID<'setSpringDamping', number>
export type SetSpringRestLengthMessage = WithUUID<'setSpringRestLength', number>
export type SetSpringStiffnessMessage = WithUUID<'setSpringStiffness', number>

type SpringMessage =
  | AddSpringMessage
  | RemoveSpringMessage
  | SetSpringDampingMessage
  | SetSpringRestLengthMessage
  | SetSpringStiffnessMessage

export type AddContactMaterialMessage = WithUUID<
  'addContactMaterial',
  [materialA: MaterialOptions, materialB: MaterialOptions, options: ContactMaterialOptions]
>
export type RemoveContactMaterialMessage = WithUUID<'removeContactMaterial'>
type ContactMaterialMessage = AddContactMaterialMessage | RemoveContactMaterialMessage

export type RayMode = 'Closest' | 'Any' | 'All'

export type AddRayMessage = WithUUID<
  'addRay',
  {
    from?: Triplet
    mode: RayMode
    to?: Triplet
  } & Pick<
    RayOptionsImpl,
    'checkCollisionResponse' | 'collisionFilterGroup' | 'collisionFilterMask' | 'skipBackfaces'
  >
>
export type RemoveRayMessage = WithUUID<'removeRay'>

type RayMessage = AddRayMessage | RemoveRayMessage

export type AddRaycastVehicleMessage = WithUUIDs<
  'addRaycastVehicle',
  [
    chassisBodyUUID: string,
    wheelsUUID: string[],
    wheelInfos: WheelInfoOptions[],
    indexForwardAxis: number,
    indexRightAxis: number,
    indexUpAxis: number,
  ]
>
export type RemoveRaycastVehicleMessage = WithUUIDs<'removeRaycastVehicle'>

export type ApplyRaycastVehicleEngineForceMessage = WithUUID<
  'applyRaycastVehicleEngineForce',
  [value: number, wheelIndex: number]
>
export type SetRaycastVehicleBrakeMessage = WithUUID<
  'setRaycastVehicleBrake',
  [brake: number, wheelIndex: number]
>
export type SetRaycastVehicleSteeringValueMessage = WithUUID<
  'setRaycastVehicleSteeringValue',
  [value: number, wheelIndex: number]
>

type RaycastVehicleMessage =
  | AddRaycastVehicleMessage
  | ApplyRaycastVehicleEngineForceMessage
  | RemoveRaycastVehicleMessage
  | SetRaycastVehicleBrakeMessage
  | SetRaycastVehicleSteeringValueMessage

export type AtomicMessage<T extends AtomicName | undefined = undefined> = WithUUID<
  SetOpName<AtomicName>,
  T extends AtomicName ? PropValue<T> : any
>
export type QuaternionMessage = WithUUID<SetOpName<'quaternion'>, Quad>
export type RotationMessage = WithUUID<SetOpName<'rotation'>, Triplet>
export type VectorMessage = WithUUID<SetOpName<VectorName>, Triplet>

export type ApplyForceMessage = WithUUID<'applyForce', [force: Triplet, worldPoint: Triplet]>
export type ApplyImpulseMessage = WithUUID<'applyImpulse', [impulse: Triplet, worldPoint: Triplet]>
export type ApplyLocalForceMessage = WithUUID<'applyLocalForce', [force: Triplet, localPoint: Triplet]>
export type ApplyLocalImpulseMessage = WithUUID<'applyLocalImpulse', [impulse: Triplet, localPoint: Triplet]>
export type ApplyTorque = WithUUID<'applyTorque', [torque: Triplet]>

type ApplyMessage =
  | ApplyForceMessage
  | ApplyImpulseMessage
  | ApplyLocalForceMessage
  | ApplyLocalImpulseMessage
  | ApplyTorque

type SerializableBodyProps = {
  onCollide: boolean
}

export type AddBodiesMessage = WithUUIDs<'addBodies', SerializableBodyProps[]> & { type: BodyShapeType }
export type RemoveBodiesMessage = WithUUIDs<'removeBodies'>

type BodiesMessage = AddBodiesMessage | RemoveBodiesMessage

export type SleepMessage = WithUUID<'sleep'>
export type WakeUpMessage = WithUUID<'wakeUp'>

export type SubscriptionTarget = 'bodies' | 'vehicles'

export type SubscribeMessage = WithUUID<
  'subscribe',
  {
    id: number
    target: SubscriptionTarget
    type: SubscriptionName
  }
>
export type UnsubscribeMessage = Operation<'unsubscribe', number>

type SubscriptionMessage = SubscribeMessage | UnsubscribeMessage

export type Observation = { [K in AtomicName]: [id: number, value: PropValue<K>, type: K] }[AtomicName]

export type WorkerFrameMessage = {
  data: Buffers & {
    active: boolean
    bodies?: string[]
    observations: Observation[]
    op: 'frame'
  }
}

export type WorkerCollideEvent = {
  data: {
    body: string
    collisionFilters: {
      bodyFilterGroup: number
      bodyFilterMask: number
      targetFilterGroup: number
      targetFilterMask: number
    }
    contact: {
      bi: string
      bj: string
      /** Normal of the contact, relative to the colliding body */
      contactNormal: number[]
      /** Contact point in world space */
      contactPoint: number[]
      id: string
      impactVelocity: number
      ni: number[]
      ri: number[]
      rj: number[]
    }
    op: 'event'
    target: string
    type: 'collide'
  }
}

export type WorkerRayhitEvent = {
  data: {
    body: string | null
    distance: number
    hasHit: boolean
    hitFaceIndex: number
    hitNormalWorld: number[]
    hitPointWorld: number[]
    op: 'event'
    ray: {
      collisionFilterGroup: number
      collisionFilterMask: number
      direction: number[]
      from: number[]
      to: number[]
      uuid: string
    }
    rayFromWorld: number[]
    rayToWorld: number[]
    shape: (Omit<Shape, 'body'> & { body: string }) | null
    shouldStop: boolean
    type: 'rayhit'
  }
}
export type WorkerCollideBeginEvent = {
  data: {
    bodyA: string
    bodyB: string
    op: 'event'
    type: 'collideBegin'
  }
}
export type WorkerCollideEndEvent = {
  data: {
    bodyA: string
    bodyB: string
    op: 'event'
    type: 'collideEnd'
  }
}
export type WorkerEventMessage =
  | WorkerCollideBeginEvent
  | WorkerCollideEndEvent
  | WorkerCollideEvent
  | WorkerRayhitEvent

export type IncomingWorkerMessage = WorkerEventMessage | WorkerFrameMessage

export type WorldPropName = 'axisIndex' | 'broadphase' | 'gravity' | 'iterations' | 'tolerance'

export type DefaultContactMaterial = Partial<
  Pick<
    ContactMaterial,
    | 'contactEquationRelaxation'
    | 'contactEquationStiffness'
    | 'friction'
    | 'frictionEquationRelaxation'
    | 'frictionEquationStiffness'
    | 'restitution'
  >
>

export type InitMessage = Operation<
  'init',
  {
    allowSleep: boolean
    axisIndex: number
    broadphase: Broadphase
    defaultContactMaterial: DefaultContactMaterial
    gravity: Triplet
    iterations: number
    quatNormalizeFast: boolean
    quatNormalizeSkip: number
    solver: Solver
    tolerance: number
  }
>

export type StepMessage = Operation<
  'step',
  {
    dt?: number
    maxSubSteps?: number
    stepSize: number
  }
> & {
  positions: Float32Array
  quaternions: Float32Array
}

type WorldMessage<T extends WorldPropName> = Operation<SetOpName<T>, Required<InitMessage['props'][T]>>

export type CannonMessage =
  | ApplyMessage
  | AtomicMessage
  | BodiesMessage
  | ConstraintMessage
  | ConstraintMotorMessage
  | InitMessage
  | QuaternionMessage
  | RaycastVehicleMessage
  | RayMessage
  | RotationMessage
  | SleepMessage
  | SpringMessage
  | StepMessage
  | ContactMaterialMessage
  | SubscriptionMessage
  | VectorMessage
  | WakeUpMessage
  | WorldMessage<WorldPropName>

type CannonMessageMap = {
  addBodies: AddBodiesMessage
  addConstraint: AddConstraintMessage
  addContactMaterial: AddContactMaterialMessage
  addRay: AddRayMessage
  addRaycastVehicle: AddRaycastVehicleMessage
  addSpring: AddSpringMessage
  applyForce: ApplyForceMessage
  applyImpulse: ApplyImpulseMessage
  applyLocalForce: ApplyLocalForceMessage
  applyLocalImpulse: ApplyLocalImpulseMessage
  applyRaycastVehicleEngineForce: ApplyRaycastVehicleEngineForceMessage
  applyTorque: ApplyTorque
  disableConstraint: DisableConstraintMessage
  disableConstraintMotor: DisableConstraintMotorMessage
  enableConstraint: EnableConstraintMessage
  enableConstraintMotor: EnableConstraintMotorMessage
  removeBodies: RemoveBodiesMessage
  removeConstraint: RemoveConstraintMessage
  removeContactMaterial: RemoveContactMaterialMessage
  removeRay: RemoveRayMessage
  removeRaycastVehicle: RemoveRaycastVehicleMessage
  removeSpring: RemoveSpringMessage
  setAllowSleep: AtomicMessage<'allowSleep'>
  setAngularDamping: AtomicMessage<'angularDamping'>
  setAngularFactor: VectorMessage
  setAngularVelocity: VectorMessage
  setAxisIndex: WorldMessage<'axisIndex'>
  setBroadphase: WorldMessage<'broadphase'>
  setCollisionFilterGroup: AtomicMessage<'collisionFilterGroup'>
  setCollisionFilterMask: AtomicMessage<'collisionFilterMask'>
  setCollisionResponse: AtomicMessage<'collisionResponse'>
  setConstraintMotorMaxForce: SetConstraintMotorMaxForce
  setConstraintMotorSpeed: SetConstraintMotorSpeed
  setFixedRotation: AtomicMessage<'fixedRotation'>
  setGravity: WorldMessage<'gravity'>
  setIsTrigger: AtomicMessage<'isTrigger'>
  setIterations: WorldMessage<'iterations'>
  setLinearDamping: AtomicMessage<'linearDamping'>
  setLinearFactor: VectorMessage
  setMass: AtomicMessage<'mass'>
  setMaterial: AtomicMessage<'material'>
  setPosition: VectorMessage
  setQuaternion: QuaternionMessage
  setRaycastVehicleBrake: SetRaycastVehicleBrakeMessage
  setRaycastVehicleSteeringValue: SetRaycastVehicleSteeringValueMessage
  setRotation: RotationMessage
  setSleepSpeedLimit: AtomicMessage<'sleepSpeedLimit'>
  setSleepTimeLimit: AtomicMessage<'sleepTimeLimit'>
  setSpringDamping: SetSpringDampingMessage
  setSpringRestLength: SetSpringRestLengthMessage
  setSpringStiffness: SetSpringStiffnessMessage
  setTolerance: WorldMessage<'tolerance'>
  setUserData: AtomicMessage<'userData'>
  setVelocity: VectorMessage
  sleep: SleepMessage
  subscribe: SubscribeMessage
  unsubscribe: UnsubscribeMessage
  wakeUp: WakeUpMessage
}

export type CannonMessageBody<T extends keyof CannonMessageMap> = Omit<CannonMessageMap[T], 'op'>

export interface CannonWebWorker {
  onmessage: (e: IncomingWorkerMessage) => void
  postMessage:
    | ((message: CannonMessage) => void)
    | ((message: CannonMessage, transferables?: Transferable[]) => void)
  terminate: () => void
}

export type ProviderContext = {
  bodies: MutableRefObject<{ [uuid: string]: number }>
  events: CannonEvents
  refs: Refs
  subscriptions: Subscriptions
  worker: CannonWorker
}

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export const context = createContext<ProviderContext>({} as ProviderContext)
export const debugContext = createContext<DebugApi>(null!)
