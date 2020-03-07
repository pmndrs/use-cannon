[![Build Status](https://travis-ci.org/react-spring/use-cannon.svg?branch=master)](https://travis-ci.org/react-spring/use-cannon) [![npm version](https://badge.fury.io/js/use-cannon.svg)](https://badge.fury.io/js/use-cannon) ![npm](https://img.shields.io/npm/dt/use-cannon.svg)

![Imgur](https://imgur.com/FpBsJPL.jpg)

    yarn add use-cannon

Experimental React hooks for [cannon](https://github.com/schteppe/cannon.js). Use this in combination with [react-three-fiber](https://github.com/react-spring/react-three-fiber).

- [x] Doesn't block the main thread, runs in a web worker
- [x] Supports instancing out of the box
- [x] Least amount of friction you'll ever experience with a physics rig ... 🙈

## Demos

Cube pushing spheres away: https://codesandbox.io/s/r3f-cannon-instanced-physics-devf8

Heap of cubes: https://codesandbox.io/s/r3f-cannon-instanced-physics-g1s88

## How it works

1. Get all the imports that you need.

```jsx
import { Physics, useBox, ... } from 'use-cannon'
```

2. Create a physics world.

```jsx
<Physics>{/* Physics related objects in here please */}</Physics>
```

3. Pick a shape that suits your object best, it could be a box, plane, sphere, etc. Give it a mass, too.

```jsx
const [ref, api] = useBox(() => ({ mass: 1 }))
```

4. Take your object, it could be a mesh, line, gltf, anything, and tie it to the reference you have just received. Et voilà, it will now be affected by gravity and other objects inside the physics world automatically.

```jsx
<mesh ref={ref} geometry={...} material={...} />
```

5. You can interact with it by using the api, which lets you apply positions and rotations.

```jsx
useFrame(({ clock }) => api.setPosition(Math.sin(clock.getElapsedTime()) * 5, 0, 0))
```

## Api

### Exports

```typescript
function Physics({
  children,
  step = 1 / 60,
  gravity = [0, -10, 0],
  tolerance = 0.001,
  iterations = 5,
  // Maximum amount of physics objects inside your scene
  // Lower this value to save memory, increase if 1000 isn't enough
  size = 1000,
}: PhysicsProps): JSX.Element

function usePlane(fn: PlaneFn, deps?: any[]): Api
function useBox(fn: BoxFn, deps?: any[]): Api
function useCylinder(fn: CylinderFn, deps?: any[]): Api
function useHeightfield(fn: HeightfieldFn, deps?: any[]): Api
function useParticle(fn: ParticleFn, deps?: any[]): Api
function useSphere(fn: SphereFn, deps?: any[]): Api
function useTrimesh(fn: TrimeshFn, deps?: any[]): Api
function useConvexPolyhedron(fn: ConvexPolyhedronFn, deps?: any[]): Api
```

### Returned api

```typescript
type Api = [
  React.MutableRefObject<THREE.Object3D | undefined>,
  (
    | {
        setPosition: (x: number, y: number, z: number) => void
        setRotation: (x: number, y: number, z: number) => void
        setPositionAt: (index: number, x: number, y: number, z: number) => void
        setRotationAt: (index: number, x: number, y: number, z: number) => void
      }
    | undefined
  )
]
```

### Props

```typescript
type PhysicsProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
  iterations?: number
  size?: number
}

type BodyProps = {
  position?: number[]
  rotation?: number[]
  scale?: number[]
  mass?: number
  velocity?: number[]
  linearDamping?: number
  angularDamping?: number
  allowSleep?: boolean
  sleepSpeedLimit?: number
  sleepTimeLimit?: number
  collisionFilterGroup?: number
  collisionFilterMask?: number
  fixedRotation?: boolean
  isKinematic?: boolean
}

type PlaneProps = BodyProps & {}
type ParticleProps = BodyProps & {}
type BoxProps = BodyProps & {
  args?: number[] // hafExtents: [x, y, z]
}
type CylinderProps = BodyProps & {
  args?: [number, number, number, number] // radiusTop, radiusBottom, height, numSegments
}
type SphereProps = BodyProps & {
  args?: number // radius
}
type TrimeshProps = BodyProps & {
  args?: [number[][], number[][]] // vertices: [[x, y, z], ...], indices: [[a, b, c], ...]
}
type ConvexPolyhedronProps = BodyProps & {
  args?:
    | THREE.Geometry
    // vertices: [[x, y, z], ...], faces: [[a, b, c], ...]
    | [(THREE.Vector3 | number[])[], (THREE.Face3 | number[])[]]
}
type HeightfieldProps = BodyProps & {
  args?: [
    number[], // data
    {
      minValue?: number
      maxValue?: number
      elementSize?: number
    }
  ]
}

type PlaneFn = (index: number) => PlaneProps
type BoxFn = (index: number) => BoxProps
type CylinderFn = (index: number) => CylinderProps
type HeightfieldFn = (index: number) => HeightfieldProps
type ParticleFn = (index: number) => ParticleProps
type SphereFn = (index: number) => SphereProps
type TrimeshFn = (index: number) => TrimeshProps
```
