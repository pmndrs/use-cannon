[![Build Status](https://travis-ci.org/pmndrs/use-cannon.svg?branch=master)](https://travis-ci.org/pmndrs/use-cannon)
[![Version](https://img.shields.io/npm/v/@react-three/cannon?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@react-three/cannon)
[![Downloads](https://img.shields.io/npm/dt/@react-three/cannon.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@react-three/cannon)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/ZZjjNvJ)

![Imgur](https://imgur.com/FpBsJPL.jpg)

    yarn add @react-three/cannon

Experimental React hooks for [cannon-es](https://github.com/pmndrs/cannon-es). Use this in combination with [react-three-fiber](https://github.com/pmndrs/react-three-fiber).

- [x] Doesn't block the main thread, runs in a web worker
- [x] Supports instancing out of the box
- [x] Least amount of friction you'll ever experience with a physics rig ... 🙈

## Demos

Ping pong: https://codesandbox.io/s/white-resonance-0mgum

Cube pushing spheres away: https://codesandbox.io/s/r3f-cannon-instanced-physics-devf8

Heap of cubes: https://codesandbox.io/s/r3f-cannon-instanced-physics-g1s88

## How it works

1. Get all the imports that you need.

```jsx
import { Physics, useBox, ... } from '@react-three/cannon'
```

2. Create a physics world.

```jsx
<Physics>{/* Physics related objects in here please */}</Physics>
```

3. Pick a shape that suits your objects contact surface, it could be a box, plane, sphere, etc. Give it a mass, too.

```jsx
const [ref, api] = useBox(() => ({ mass: 1 }))
```

4. Take your object, it could be a mesh, line, gltf, anything, and tie it to the reference you have just received. Et voilà, it will now be affected by gravity and other objects inside the physics world.

```jsx
<mesh ref={ref} geometry={...} material={...} />
```

5. You can interact with it by using [the api](#returned-api), which lets you apply positions, rotations, velocities, forces and impulses.

```jsx
useFrame(({ clock }) => api.position.set(Math.sin(clock.getElapsedTime()) * 5, 0, 0))
```

6. You can use the body api to subscribe to properties to get updates on each frame.

```jsx
const velocity = useRef([0, 0, 0])
useEffect(() => {
  const unsubscribe = api.velocity.subscribe((v) => (velocity.current = v))
  return () => unsubscribe()
}, [])
```

## Simple example

Let's make a cube falling onto a plane. You can play with a sandbox [here](https://codesandbox.io/s/r3f-cannon-instanced-physics-l40oh).

```jsx
import { Canvas } from '@react-three/fiber'
import { Physics, usePlane, useBox } from '@react-three/cannon'

function Plane(props) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))
  return (
    <mesh ref={ref}>
      <planeBufferGeometry args={[100, 100]} />
    </mesh>
  )
}

function Cube(props) {
  const [ref] = useBox(() => ({ mass: 1, position: [0, 5, 0], ...props }))
  return (
    <mesh ref={ref}>
      <boxBufferGeometry />
    </mesh>
  )
}

ReactDOM.render(
  <Canvas>
    <Physics>
      <Plane />
      <Cube />
    </Physics>
  </Canvas>,
  document.getElementById('root'),
)
```

## Debug

You can debug your scene using the [cannon-es-debugger](https://github.com/pmndrs/cannon-es-debugger). This will show you how cannon "sees" your scene. Do not use this in production as it will pull in cannon-es a second time!

```jsx
import { Physics, Debug } from '@react-three/cannon'

<Physics>
  <Debug color="black" scale={1.1}>
    {/* children */}
  </Debug>
</Physics>
```

## Api

### Exports

```typescript
function Physics({
  children,
  shouldInvalidate = true,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
  allowSleep = false,
  broadphase = 'Naive',
  axisIndex = 0,
  defaultContactMaterial = {
    contactEquationStiffness: 1e6,
  },
  // Maximum amount of physics objects inside your scene
  // Lower this value to save memory, increase if 1000 isn't enough
  size = 1000,
}: ProviderProps): JSX.Element

function Debug({ children, color = 'black', scale = 1 }: DebugProps): JSX.Element

function usePlane(
  fn: GetByIndex<PlaneProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useBox(fn: GetByIndex<BoxProps>, fwdRef?: React.MutableRefObject<THREE.Object3D>, deps?: any[]): Api

function useCylinder(
  fn: GetByIndex<CylinderProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useHeightfield(
  fn: GetByIndex<HeightfieldProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useParticle(
  fn: GetByIndex<ParticleProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useSphere(
  fn: GetByIndex<SphereProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useTrimesh(
  fn: GetByIndex<TrimeshProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useConvexPolyhedron(
  fn: GetByIndex<ConvexPolyhedronProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useCompoundBody(
  fn: GetByIndex<CompoundBodyProps>,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps?: any[],
): Api

function useRaycastVehicle(
  fn: () => RaycastVehicleProps,
  fwdRef?: React.MutableRefObject<THREE.Object3D>,
  deps: any[] = [],
): [React.MutableRefObject<THREE.Object3D | undefined>, RaycastVehiclePublicApi]

function usePointToPointConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: PointToPointConstraintOpts,
  deps: any[] = [],
): ConstraintApi

function useConeTwistConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: ConeTwistConstraintOpts,
  deps: any[] = [],
): ConstraintApi

function useDistanceConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: DistanceConstraintOpts,
  deps: any[] = [],
): ConstraintApi

function useHingeConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: HingeConstraintOpts,
  deps: any[] = [],
): ConstraintApi

function useLockConstraint(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: LockConstraintOpts,
  deps: any[] = [],
): ConstraintApi

function useSpring(
  bodyA: React.MutableRefObject<THREE.Object3D>,
  bodyB: React.MutableRefObject<THREE.Object3D>,
  optns: SpringOptns,
  deps: any[] = [],
): void

function useRaycastClosest(options: RayOptns, callback: (e: Event) => void, deps: any[] = []): void
function useRaycastAny(options: RayOptns, callback: (e: Event) => void, deps: any[] = []): void
function useRaycastAll(options: RayOptns, callback: (e: Event) => void, deps: any[] = []): void
```

### Returned api

```typescript
interface WorkerApi extends WorkerProps<AtomicProps> {
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

type Api = [React.MutableRefObject<THREE.Object3D | undefined>, PublicApi]

type ConstraintApi = [
  React.MutableRefObject<THREE.Object3D>,
  React.MutableRefObject<THREE.Object3D>,
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

interface RaycastVehiclePublicApi {
  applyEngineForce: (value: number, wheelIndex: number) => void
  setBrake: (brake: number, wheelIndex: number) => void
  setSteeringValue: (value: number, wheelIndex: number) => void
  sliding: {
    subscribe: (callback: (sliding: boolean) => void) => void
  }
}
```

### Props

```typescript
type ProviderProps = {
  children: React.ReactNode
  shouldInvalidate?: boolean
  gravity?: number[]
  tolerance?: number
  step?: number
  iterations?: number
  allowSleep?: boolean
  broadphase?: 'Naive' | 'SAP'
  axisIndex?: number
  defaultContactMaterial?: {
    friction?: number
    restitution?: number
    contactEquationStiffness?: number
    contactEquationRelaxation?: number
    frictionEquationStiffness?: number
    frictionEquationRelaxation?: number
  }
  size?: number
}

interface AtomicProps {
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

type Triplet = [x: number, y: number, z: number]

interface BodyProps<T = unknown> extends AtomicProps {
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

type Event = RayhitEvent | CollideEvent | CollideBeginEvent | CollideEndEvent
type CollideEvent = {
  op: string
  type: 'collide'
  body: THREE.Object3D
  target: THREE.Object3D
  contact: {
    // the world position of the point of contact
    contactPoint: number[]
    // the normal of the collision on the surface of
    // the colliding body
    contactNormal: number[]
    // velocity of impact along the contact normal
    impactVelocity: number
    // a unique ID for each contact event
    id: string
    // these are lower-level properties from cannon:
    // bi: one of the bodies involved in contact
    bi: THREE.Object3D
    // bj: the other body involved in contact
    bj: THREE.Object3D
    // ni: normal of contact relative to bi
    ni: number[]
    // ri: the point of contact relative to bi
    ri: number[]
    // rj: the point of contact relative to bj
    rj: number[]
  }
  collisionFilters: {
    bodyFilterGroup: number
    bodyFilterMask: number
    targetFilterGroup: number
    targetFilterMask: number
  }
}
type CollideBeginEvent = {
  op: 'event'
  type: 'collideBegin'
  target: Object3D
  body: Object3D
}
type CollideEndEvent = {
  op: 'event'
  type: 'collideEnd'
  target: Object3D
  body: Object3D
}
type RayhitEvent = {
  op: string
  type: 'rayhit'
  body: THREE.Object3D
  target: THREE.Object3D
}

type CylinderArgs = [radiusTop?: number, radiusBottom?: number, height?: number, numSegments?: number]
type TrimeshArgs = [vertices: number[], indices: number[]]
type HeightfieldArgs = [
  data: number[][],
  options: { elementSize?: number; maxValue?: number; minValue?: number },
]
type ConvexPolyhedronArgs<V extends VectorTypes = VectorTypes> = [
  vertices?: V[],
  faces?: number[][],
  normals?: V[],
  axes?: V[],
  boundingSphereRadius?: number,
]

interface PlaneProps extends BodyProps {}
interface BoxProps extends BodyProps<Triplet> {} // extents: [x, y, z]
interface CylinderProps extends BodyProps<CylinderArgs> {}
interface ParticleProps extends BodyProps {}
interface SphereProps extends BodyProps<number> {} // radius
interface TrimeshProps extends BodyPropsArgsRequired<TrimeshArgs> {}
interface HeightfieldProps extends BodyPropsArgsRequired<HeightfieldArgs> {}
interface ConvexPolyhedronProps extends BodyProps<ConvexPolyhedronArgs> {}
interface CompoundBodyProps extends BodyProps {
  shapes: BodyProps & { type: ShapeType }[]
}

interface ConstraintOptns {
  maxForce?: number
  collideConnected?: boolean
  wakeUpBodies?: boolean
}

interface PointToPointConstraintOpts extends ConstraintOptns {
  pivotA: Triplet
  pivotB: Triplet
}

interface ConeTwistConstraintOpts extends ConstraintOptns {
  pivotA?: Triplet
  axisA?: Triplet
  pivotB?: Triplet
  axisB?: Triplet
  angle?: number
  twistAngle?: number
}
interface DistanceConstraintOpts extends ConstraintOptns {
  distance?: number
}

interface HingeConstraintOpts extends ConstraintOptns {
  pivotA?: Triplet
  axisA?: Triplet
  pivotB?: Triplet
  axisB?: Triplet
}

interface LockConstraintOpts extends ConstraintOptns {}

interface SpringOptns {
  restLength?: number
  stiffness?: number
  damping?: number
  worldAnchorA?: Triplet
  worldAnchorB?: Triplet
  localAnchorA?: Triplet
  localAnchorB?: Triplet
}

interface WheelInfoOptions {
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

interface RaycastVehicleProps {
  chassisBody: React.MutableRefObject<THREE.Object3D | undefined>
  wheels: React.MutableRefObject<THREE.Object3D | undefined>[]
  wheelInfos: WheelInfoOptions[]
  indexForwardAxis?: number
  indexRightAxis?: number
  indexUpAxis?: number
}
```

### FAQ

#### Broadphases

- NaiveBroadphase is as simple as it gets. It considers every body to be a potential collider with every other body. This results in the maximum number of narrowphase checks.
- SAPBroadphase sorts bodies along an axis and then moves down that list finding pairs by looking at body size and position of the next bodies. Control what axis to sort along by setting the axisIndex property.

#### Types

- A dynamic body is fully simulated. Can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass.
- A static body does not move during simulation and behaves as if it has infinite mass. Static bodies can be moved manually by setting the position of the body. The velocity of a static body is always zero. Static bodies do not collide with other static or kinematic bodies.
- A kinematic body moves under simulation according to its velocity. They do not respond to forces. They can be moved manually, but normally a kinematic body is moved by setting its velocity. A kinematic body behaves as if it has infinite mass. Kinematic bodies do not collide with other static or kinematic bodies.
