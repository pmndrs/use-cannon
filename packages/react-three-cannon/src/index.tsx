import type { FC } from 'react'
import { Suspense } from 'react'

import type { PhysicsProviderProps } from './physics-provider'
import { PhysicsProvider } from './physics-provider'

export type { DebugProviderProps as DebugProps } from './debug-provider'
export { DebugProvider as Debug } from './debug-provider'
export * from './hooks'

export const Physics: FC<PhysicsProviderProps> = (props) => (
  <Suspense fallback={null}>
    <PhysicsProvider {...props} />
  </Suspense>
)

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
