import type { ContactMaterialOptions, MaterialOptions, RayOptions as RayOptionsImpl, Shape } from 'cannon-es'
import type { Object3D } from 'three'

import type { AtomicProps, BodyShapeType } from './body'

export type { ContactMaterialOptions }

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

export type PropValue<T extends SubscriptionName = SubscriptionName> = T extends AtomicName
  ? AtomicProps[T]
  : T extends VectorName
  ? Triplet
  : T extends 'quaternion'
  ? Quad
  : T extends 'sliding'
  ? boolean
  : never

export type Subscription = Partial<{ [K in SubscriptionName]: (value: PropValue<K>) => void }>
export type Subscriptions = Partial<{
  [id: number]: Subscription
}>

export type AtomicName =
  | 'allowSleep'
  | 'angularDamping'
  | 'collisionFilterGroup'
  | 'collisionFilterMask'
  | 'collisionResponse'
  | 'fixedRotation'
  | 'isTrigger'
  | 'linearDamping'
  | 'mass'
  | 'material'
  | 'sleepSpeedLimit'
  | 'sleepTimeLimit'
  | 'userData'

export type VectorName = 'angularFactor' | 'angularVelocity' | 'linearFactor' | 'position' | 'velocity'

export type SubscriptionName = AtomicName | VectorName | 'quaternion' | 'sliding'

export type SetOpName<T extends AtomicName | VectorName | WorldPropName | 'quaternion' | 'rotation'> =
  `set${Capitalize<T>}`

type Operation<T extends OpName, P> = { op: T } & (P extends symbol ? {} : { props: P })
type WithUUID<T extends OpName, P = symbol> = Operation<T, P> & { uuid: string }
type WithUUIDs<T extends OpName, P = symbol> = Operation<T, P> & { uuid: string[] }

type AddConstraintProps = [
  uuidA: string,
  uuidB: string,
  options: {
    angle?: number
    axisA?: Triplet
    axisB?: Triplet
    collideConnected?: boolean
    distance?: number
    maxForce?: number
    maxMultiplier?: number
    pivotA?: Triplet
    pivotB?: Triplet
    twistAngle?: number
    wakeUpBodies?: boolean
  },
]

export type AddContactMaterialProps = [
  materialA: MaterialOptions,
  materialB: MaterialOptions,
  options: ContactMaterialOptions,
]

export type RayMode = 'Closest' | 'Any' | 'All'

type AddRayProps = {
  from?: Triplet
  mode: RayMode
  to?: Triplet
} & Pick<
  RayOptionsImpl,
  'checkCollisionResponse' | 'collisionFilterGroup' | 'collisionFilterMask' | 'skipBackfaces'
>

export type RayOptions = Omit<AddRayProps, 'mode'>

type AtomicMessage<T extends AtomicName> = WithUUID<SetOpName<T>, AtomicProps[T]>
type VectorMessage = WithUUID<SetOpName<VectorName>, Triplet>

type SerializableBodyProps = {
  onCollide: boolean
}

export type SubscriptionTarget = 'bodies' | 'vehicles'

type SubscribeMessageProps = {
  id: number
  target: SubscriptionTarget
  type: SubscriptionName
}

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
      id: number
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
      from?: Triplet
      to?: Triplet
      uuid: string
    }
    rayFromWorld: Triplet
    rayToWorld: Triplet
    shape:
      | (Omit<
          Shape,
          'body' | 'updateBoundingSphereRadius' | 'volume' | 'calculateLocalInertia' | 'calculateWorldAABB'
        > & { body: string })
      | null
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

export type WorldPropName =
  | 'axisIndex'
  | 'broadphase'
  | 'frictionGravity'
  | 'gravity'
  | 'iterations'
  | 'tolerance'

export type StepProps = {
  maxSubSteps?: number
  stepSize: number
  timeSinceLastCalled?: number
}

export type WorldProps = {
  allowSleep: boolean
  axisIndex: 0 | 1 | 2
  broadphase: Broadphase
  defaultContactMaterial: ContactMaterialOptions
  frictionGravity: Triplet | null
  gravity: Triplet
  iterations: number
  quatNormalizeFast: boolean
  quatNormalizeSkip: number
  solver: Solver
  tolerance: number
}

type WorldMessage<T extends WorldPropName> = Operation<SetOpName<T>, WorldProps[T]>

export type CannonMessageMap = {
  addBodies: WithUUIDs<'addBodies', SerializableBodyProps[]> & { type: BodyShapeType }
  addConstraint: WithUUID<'addConstraint', AddConstraintProps> & { type: 'Hinge' | ConstraintTypes }
  addContactMaterial: WithUUID<'addContactMaterial', AddContactMaterialProps>
  addRay: WithUUID<'addRay', AddRayProps>
  addRaycastVehicle: WithUUID<
    'addRaycastVehicle',
    [
      chassisBodyUUID: string,
      wheelUUIDs: string[],
      wheelInfos: WheelInfoOptions[],
      indexForwardAxis: number,
      indexRightAxis: number,
      indexUpAxis: number,
    ]
  >
  addSpring: WithUUID<'addSpring', [uuidA: string, uuidB: string, options: SpringOptns]>
  applyForce: WithUUID<'applyForce', [force: Triplet, worldPoint: Triplet]>
  applyImpulse: WithUUID<'applyImpulse', [impulse: Triplet, worldPoint: Triplet]>
  applyLocalForce: WithUUID<'applyLocalForce', [force: Triplet, localPoint: Triplet]>
  applyLocalImpulse: WithUUID<'applyLocalImpulse', [impulse: Triplet, localPoint: Triplet]>
  applyRaycastVehicleEngineForce: WithUUID<
    'applyRaycastVehicleEngineForce',
    [value: number, wheelIndex: number]
  >
  applyTorque: WithUUID<'applyTorque', [torque: Triplet]>
  disableConstraint: WithUUID<'disableConstraint'>
  disableConstraintMotor: WithUUID<'disableConstraintMotor'>
  enableConstraint: WithUUID<'enableConstraint'>
  enableConstraintMotor: WithUUID<'enableConstraintMotor'>
  init: Operation<'init', WorldProps>
  removeBodies: WithUUIDs<'removeBodies'>
  removeConstraint: WithUUID<'removeConstraint'>
  removeContactMaterial: WithUUID<'removeContactMaterial'>
  removeRay: WithUUID<'removeRay'>
  removeRaycastVehicle: WithUUID<'removeRaycastVehicle'>
  removeSpring: WithUUID<'removeSpring'>
  setAllowSleep: AtomicMessage<'allowSleep'>
  setAngularDamping: AtomicMessage<'angularDamping'>
  setAngularFactor: VectorMessage
  setAngularVelocity: VectorMessage
  setAxisIndex: WorldMessage<'axisIndex'>
  setBroadphase: WorldMessage<'broadphase'>
  setCollisionFilterGroup: AtomicMessage<'collisionFilterGroup'>
  setCollisionFilterMask: AtomicMessage<'collisionFilterMask'>
  setCollisionResponse: AtomicMessage<'collisionResponse'>
  setConstraintMotorMaxForce: WithUUID<'setConstraintMotorMaxForce', number>
  setConstraintMotorSpeed: WithUUID<'setConstraintMotorSpeed', number>
  setFixedRotation: AtomicMessage<'fixedRotation'>
  setFrictionGravity: WorldMessage<'frictionGravity'>
  setGravity: WorldMessage<'gravity'>
  setIsTrigger: AtomicMessage<'isTrigger'>
  setIterations: WorldMessage<'iterations'>
  setLinearDamping: AtomicMessage<'linearDamping'>
  setLinearFactor: VectorMessage
  setMass: AtomicMessage<'mass'>
  setMaterial: AtomicMessage<'material'>
  setPosition: VectorMessage
  setQuaternion: WithUUID<SetOpName<'quaternion'>, Quad>
  setRaycastVehicleBrake: WithUUID<'setRaycastVehicleBrake', [brake: number, wheelIndex: number]>
  setRaycastVehicleSteeringValue: WithUUID<
    'setRaycastVehicleSteeringValue',
    [value: number, wheelIndex: number]
  >
  setRotation: WithUUID<SetOpName<'rotation'>, Triplet>
  setSleepSpeedLimit: AtomicMessage<'sleepSpeedLimit'>
  setSleepTimeLimit: AtomicMessage<'sleepTimeLimit'>
  setSpringDamping: WithUUID<'setSpringDamping', number>
  setSpringRestLength: WithUUID<'setSpringRestLength', number>
  setSpringStiffness: WithUUID<'setSpringStiffness', number>
  setTolerance: WorldMessage<'tolerance'>
  setUserData: AtomicMessage<'userData'>
  setVelocity: VectorMessage
  sleep: WithUUID<'sleep'>
  step: Operation<'step', StepProps> & {
    positions: Float32Array
    quaternions: Float32Array
  }
  subscribe: WithUUID<'subscribe', SubscribeMessageProps>
  unsubscribe: Operation<'unsubscribe', number>
  wakeUp: WithUUID<'wakeUp'>
}

type OpName = keyof CannonMessageMap

export type CannonMessageBody<T extends OpName> = Omit<CannonMessageMap[T], 'op'>
export type CannonMessageProps<T extends OpName> = CannonMessageMap[T] extends { props: unknown }
  ? CannonMessageMap[T]['props']
  : never
export type CannonMessage = CannonMessageMap[OpName]

export interface CannonWebWorker extends Worker {
  onmessage: ((e: IncomingWorkerMessage) => void) | null
  postMessage(message: CannonMessage, transfer: Transferable[]): void
  postMessage(message: CannonMessage, options?: StructuredSerializeOptions): void
  terminate: () => void
}
