import type {
  BodyProps,
  BodyShapeType,
  CannonWorkerAPI,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  RayhitEvent,
  Refs,
  Subscriptions,
} from '@pmndrs/cannon-worker-api'
import type { MutableRefObject } from 'react'
import { createContext } from 'react'

export type {
  AtomicName,
  AtomicProps,
  BodyProps,
  BodyPropsArgsRequired,
  BodyShapeType,
  BoxProps,
  Broadphase,
  Buffers,
  CannonMessage,
  CannonMessageBody,
  CannonMessageMap,
  CannonMessageProps,
  CannonWebWorker,
  CollideBeginEvent,
  CollideEndEvent,
  CollideEvent,
  CompoundBodyProps,
  ConeTwistConstraintOpts,
  ConstraintOptns,
  ConstraintTypes,
  ConvexPolyhedronArgs,
  ConvexPolyhedronProps,
  CylinderArgs,
  CylinderProps,
  DistanceConstraintOpts,
  HeightfieldArgs,
  HeightfieldProps,
  HingeConstraintOpts,
  IncomingWorkerMessage,
  LockConstraintOpts,
  Observation,
  ParticleProps,
  PlaneProps,
  PointToPointConstraintOpts,
  PropValue,
  Quad,
  RayhitEvent,
  RayMode,
  RayOptions,
  Refs,
  SetOpName,
  ShapeType,
  Solver,
  SphereArgs,
  SphereProps,
  SpringOptns,
  StepProps,
  Subscription,
  SubscriptionName,
  Subscriptions,
  SubscriptionTarget,
  TrimeshArgs,
  TrimeshProps,
  Triplet,
  VectorName,
  VectorProps,
  WheelInfoOptions,
  WorkerCollideBeginEvent,
  WorkerCollideEndEvent,
  WorkerCollideEvent,
  WorkerEventMessage,
  WorkerFrameMessage,
  WorkerRayhitEvent,
  WorldPropName,
  WorldProps,
} from '@pmndrs/cannon-worker-api'

type CannonEvent = CollideBeginEvent | CollideEndEvent | CollideEvent | RayhitEvent
type CallbackByType<T extends { type: string }> = {
  [K in T['type']]?: T extends { type: K } ? (e: T) => void : never
}

export type CannonEvents = { [uuid: string]: Partial<CallbackByType<CannonEvent>> }

export type ProviderContext = {
  bodies: MutableRefObject<{ [uuid: string]: number }>
  events: CannonEvents
  refs: Refs
  subscriptions: Subscriptions
  worker: CannonWorkerAPI
}

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}

export const context = createContext<ProviderContext>({} as ProviderContext)
export const debugContext = createContext<DebugApi>(null!)
