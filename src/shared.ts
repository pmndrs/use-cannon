import { Box, ConvexPolyhedron, Cylinder, Heightfield, Particle, Plane, Sphere, Trimesh } from 'cannon-es'

import type { BODY_TYPES, Body } from 'cannon-es'
import type { Object3D, Shape, Vector3 } from 'three'

export type Triplet = [x: number, y: number, z: number]
export type VectorTypes = Triplet | Vector3

export type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
  vertices?: V[],
  faces?: number[][],
  normals?: V[],
  axes?: V[],
  boundingSphereRadius?: number,
]

const shapes = {
  Box,
  ConvexPolyhedron,
  Cylinder,
  Heightfield,
  Particle,
  Plane,
  Sphere,
  Trimesh,
}
type ShapeMap = typeof shapes
export type ShapeType = keyof ShapeMap

export type BodyShapeType = ShapeType | 'Compound'

type BodyArgs = Required<ConstructorParameters<typeof Body>>[0]

export type AtomicProps = Pick<
  BodyArgs,
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
> & {
  userData?: {}
}

export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }
export type CannonEvents = { [uuid: string]: (e: CannonEvent) => void }
export type Subscriptions = {
  [id: string]: (value: AtomicProps[keyof AtomicProps] | number[]) => void
}

type WorkerFrameMessage = {
  data: Buffers & {
    op: 'frame'
    observations: [string, any]
    active: boolean
    bodies?: string[]
  }
}

export type IncomingWorkerMessage = WorkerFrameMessage | WorkerEventMessage

export type WorkerCollideEvent = {
  data: {
    op: 'event'
    type: 'collide'
    target: string
    body: string
    contact: {
      id: string
      ni: number[]
      ri: number[]
      rj: number[]
      impactVelocity: number
      bi: string
      bj: string
      /** Contact point in world space */
      contactPoint: number[]
      /** Normal of the contact, relative to the colliding body */
      contactNormal: number[]
    }
    collisionFilters: {
      bodyFilterGroup: number
      bodyFilterMask: number
      targetFilterGroup: number
      targetFilterMask: number
    }
  }
}
export type WorkerRayhitEvent = {
  data: {
    op: 'event'
    type: 'rayhit'
    ray: {
      from: number[]
      to: number[]
      direction: number[]
      collisionFilterGroup: number
      collisionFilterMask: number
      uuid: string
    }
    hasHit: boolean
    body: string | null
    shape: (Omit<Shape, 'body'> & { body: string }) | null
    rayFromWorld: number[]
    rayToWorld: number[]
    hitNormalWorld: number[]
    hitPointWorld: number[]
    hitFaceIndex: number
    distance: number
    shouldStop: boolean
  }
}
export type WorkerCollideBeginEvent = {
  data: {
    op: 'event'
    type: 'collideBegin'
    bodyA: string
    bodyB: string
  }
}
export type WorkerCollideEndEvent = {
  data: {
    op: 'event'
    type: 'collideEnd'
    bodyA: string
    bodyB: string
  }
}
export type WorkerEventMessage =
  | WorkerCollideEvent
  | WorkerRayhitEvent
  | WorkerCollideBeginEvent
  | WorkerCollideEndEvent

type WorkerContact = WorkerCollideEvent['data']['contact']
export type CollideEvent = Omit<WorkerCollideEvent['data'], 'body' | 'target' | 'contact'> & {
  body: Object3D
  target: Object3D
  contact: Omit<WorkerContact, 'bi' | 'bj'> & {
    bi: Object3D
    bj: Object3D
  }
}
export type CollideBeginEvent = {
  op: 'event'
  type: 'collideBegin'
  target: Object3D
  body: Object3D
}
export type CollideEndEvent = {
  op: 'event'
  type: 'collideEnd'
  target: Object3D
  body: Object3D
}
export type RayhitEvent = Omit<WorkerRayhitEvent['data'], 'body'> & { body: Object3D | null }
export type CannonEvent = RayhitEvent | CollideEvent | CollideBeginEvent | CollideEndEvent

export type VectorProps = {
  angularFactor?: Triplet
  angularVelocity?: Triplet
  linearFactor?: Triplet
  position?: Triplet
  rotation?: Triplet
  velocity?: Triplet
}

export type BodyType = Capitalize<Lowercase<keyof typeof BODY_TYPES>>

export type BodyProps<T = unknown> = AtomicProps &
  VectorProps & {
    args?: T
    shapes?: CompoundShapeProps[]
    type?: BodyType
    onCollide?: (e: CollideEvent) => void
    onCollideBegin?: (e: CollideBeginEvent) => void
    onCollideEnd?: (e: CollideEndEvent) => void
  }
export interface BodyPropsArgsRequired<T = unknown> extends BodyProps<T> {
  args: T
}

export type CylinderArgs = [radiusTop?: number, radiusBottom?: number, height?: number, numSegments?: number]
export type TrimeshArgs = [vertices: number[], indices: number[]]
export type HeightfieldArgs = [
  data: number[][],
  options: { elementSize?: number; maxValue?: number; minValue?: number },
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
  shapes: CompoundShapeProps[]
}

export type CompoundShapeProps<T = unknown> = Pick<AtomicProps, 'material'> &
  Pick<VectorProps, 'position' | 'rotation'> & { args?: T; shapeType: ShapeType }

export type ProviderContext = {
  worker: Worker
  bodies: React.MutableRefObject<{ [uuid: string]: number }>
  buffers: Buffers
  refs: Refs
  events: CannonEvents
  subscriptions: Subscriptions
}

export type DebugApi = {
  add(id: string, props: BodyProps, type: BodyShapeType): void
  remove(id: string): void
}
