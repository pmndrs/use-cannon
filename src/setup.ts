import type { ContactMaterialOptions, MaterialOptions, RayOptions } from 'cannon-es'
import type { MutableRefObject } from 'react'
import { createContext } from 'react'
import type { Object3D } from 'three'

import type {
  AtomicProps,
  BodyProps,
  BodyShapeType,
  ConstraintTypes,
  Quad,
  SpringOptns,
  Triplet,
  WheelInfoOptions,
} from './hooks'
import type { ProviderProps, WorkerCollideEvent, WorkerRayhitEvent } from './Provider'

export type Broadphase = 'Naive' | 'SAP'
export type Solver = 'GS' | 'Split'
export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }
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

type Operation<T extends string, P> = { op: T } & (P extends void ? {} : { props: P })
type WithUUID<T extends string, P = void> = Operation<T, P> & { uuid: string }
type WithUUIDs<T extends string, P = void> = Operation<T, P> & { uuid: string[] }

type AddConstraintMessage = WithUUID<'addConstraint', [uuidA: string, uuidB: string, options: {}]> & {
  type: 'Hinge' | ConstraintTypes
}

type DisableConstraintMessage = WithUUID<'disableConstraint'>
type EnableConstraintMessage = WithUUID<'enableConstraint'>
type RemoveConstraintMessage = WithUUID<'removeConstraint'>

type ConstraintMessage =
  | AddConstraintMessage
  | DisableConstraintMessage
  | EnableConstraintMessage
  | RemoveConstraintMessage

type DisableConstraintMotorMessage = WithUUID<'disableConstraintMotor'>
type EnableConstraintMotorMessage = WithUUID<'enableConstraintMotor'>
type SetConstraintMotorMaxForce = WithUUID<'setConstraintMotorMaxForce', number>
type SetConstraintMotorSpeed = WithUUID<'setConstraintMotorSpeed', number>

type ConstraintMotorMessage =
  | DisableConstraintMotorMessage
  | EnableConstraintMotorMessage
  | SetConstraintMotorSpeed
  | SetConstraintMotorMaxForce

type AddSpringMessage = WithUUID<'addSpring', [uuidA: string, uuidB: string, options: SpringOptns]>
type RemoveSpringMessage = WithUUID<'removeSpring'>

type SetSpringDampingMessage = WithUUID<'setSpringDamping', number>
type SetSpringRestLengthMessage = WithUUID<'setSpringRestLength', number>
type SetSpringStiffnessMessage = WithUUID<'setSpringStiffness', number>

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
type RemoveContactMaterialMessage = WithUUID<'removeContactMaterial'>
type ContactMaterialMessage = AddContactMaterialMessage | RemoveContactMaterialMessage

export type RayMode = 'Closest' | 'Any' | 'All'

export type AddRayMessage = WithUUID<
  'addRay',
  {
    from?: Triplet
    mode: RayMode
    to?: Triplet
  } & Pick<
    RayOptions,
    'checkCollisionResponse' | 'collisionFilterGroup' | 'collisionFilterMask' | 'skipBackfaces'
  >
>
type RemoveRayMessage = WithUUID<'removeRay'>

type RayMessage = AddRayMessage | RemoveRayMessage

type AddRaycastVehicleMessage = WithUUIDs<
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
type RemoveRaycastVehicleMessage = WithUUIDs<'removeRaycastVehicle'>

type ApplyRaycastVehicleEngineForceMessage = WithUUID<
  'applyRaycastVehicleEngineForce',
  [value: number, wheelIndex: number]
>
type SetRaycastVehicleBrakeMessage = WithUUID<'setRaycastVehicleBrake', [brake: number, wheelIndex: number]>
type SetRaycastVehicleSteeringValueMessage = WithUUID<
  'setRaycastVehicleSteeringValue',
  [value: number, wheelIndex: number]
>

type RaycastVehicleMessage =
  | AddRaycastVehicleMessage
  | ApplyRaycastVehicleEngineForceMessage
  | RemoveRaycastVehicleMessage
  | SetRaycastVehicleBrakeMessage
  | SetRaycastVehicleSteeringValueMessage

type AtomicMessage = WithUUID<SetOpName<AtomicName>, any>
type QuaternionMessage = WithUUID<SetOpName<'quaternion'>, Quad>
type RotationMessage = WithUUID<SetOpName<'rotation'>, Triplet>
type VectorMessage = WithUUID<SetOpName<VectorName>, Triplet>

type ApplyForceMessage = WithUUID<'applyForce', [force: Triplet, worldPoint: Triplet]>
type ApplyImpulseMessage = WithUUID<'applyImpulse', [impulse: Triplet, worldPoint: Triplet]>
type ApplyLocalForceMessage = WithUUID<'applyLocalForce', [force: Triplet, localPoint: Triplet]>
type ApplyLocalImpulseMessage = WithUUID<'applyLocalImpulse', [impulse: Triplet, localPoint: Triplet]>
type ApplyTorque = WithUUID<'applyTorque', [torque: Triplet]>

type ApplyMessage =
  | ApplyForceMessage
  | ApplyImpulseMessage
  | ApplyLocalForceMessage
  | ApplyLocalImpulseMessage
  | ApplyTorque

type SerializableBodyProps = {
  onCollide: boolean
}

type AddBodiesMessage = WithUUIDs<'addBodies', SerializableBodyProps[]> & { type: BodyShapeType }
type RemoveBodiesMessage = WithUUIDs<'removeBodies'>

type BodiesMessage = AddBodiesMessage | RemoveBodiesMessage

type SleepMessage = WithUUID<'sleep'>
type WakeUpMessage = WithUUID<'wakeUp'>

export type SubscriptionTarget = 'bodies' | 'vehicles'

type SubscribeMessage = WithUUID<
  'subscribe',
  {
    id: number
    target: SubscriptionTarget
    type: SubscriptionName
  }
>
type UnsubscribeMessage = Operation<'unsubscribe', number>

type SubscriptionMessage = SubscribeMessage | UnsubscribeMessage

export type WorldPropName = 'axisIndex' | 'broadphase' | 'gravity' | 'iterations' | 'tolerance'

type WorldMessage<T extends WorldPropName> = Operation<SetOpName<T>, Required<ProviderProps[T]>>

export type InitProps = {
  allowSleep?: boolean
  axisIndex?: number
  broadphase?: Broadphase
  defaultContactMaterial?: ContactMaterialOptions
  gravity?: Triplet
  iterations?: number
  quatNormalizeFast?: boolean
  quatNormalizeSkip?: number
  solver?: Solver
  tolerance?: number
}

type InitMessage = Operation<'init', InitProps>

type StepProps = {
  maxSubSteps?: number
  stepSize: number
  timeSinceLastCalled?: number
}

type StepMessage = Operation<'step', StepProps>

type CannonMessage =
  | ApplyMessage
  | AtomicMessage
  | BodiesMessage
  | ConstraintMessage
  | ConstraintMotorMessage
  | ContactMaterialMessage
  | InitMessage
  | QuaternionMessage
  | RaycastVehicleMessage
  | RayMessage
  | RotationMessage
  | SleepMessage
  | SpringMessage
  | StepMessage
  | SubscriptionMessage
  | VectorMessage
  | WakeUpMessage
  | WorldMessage<WorldPropName>

export interface CannonWorker extends Worker {
  postMessage(message: CannonMessage, transfer: Transferable[]): void
  postMessage(message: CannonMessage, options?: StructuredSerializeOptions): void
}

export type ProviderContext = {
  bodies: MutableRefObject<{ [uuid: string]: number }>
  buffers: Buffers
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
