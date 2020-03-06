![Imgur](https://imgur.com/FpBsJPL.jpg)

<br/>

    yarn add use-cannon

Experimental React hooks for [cannon](https://github.com/schteppe/cannon.js). Use this in combination with [react-three-fiber](https://github.com/react-spring/react-three-fiber). 

- [x] Doesn't block the main thread, runs in a web worker
- [x] Supports instancing out of the box
- [x] Least amount of friction you'll ever experience with a physics rig

How does it work? 

Take an object (meshes, lines, gltf, anything), tie it to one of cannons shapes that suits your usecase best (box, plane, sphere, ...), give it a mass, and that's it. Now the object is affected by gravity and other objects subscribed to the physics world. You interact with it by using the returned api, which lets you apply positions and rotations.

# Demos

Cube pushing spheres away: https://codesandbox.io/s/r3f-cannon-instanced-physics-devf8

Heap of cubes: https://codesandbox.io/s/r3f-cannon-instanced-physics-g1s88

# Api

```jsx
import { Phsysics, usePlane, useBox, useSphere } from 'use-cannon'

function Plane() {
  const [ref] = usePlane(() => ({ mass: 0 }))
  return (
    <mesh ref={ref}>
      <planeBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color="hotpink" />
    </mesh>
  )
}

function Box() {
  const [ref] = useBox(() => ({ mass: 1, position: [0, 0, 10], args: [0.5, 0.5, 0.5] }))
  return (
    <mesh ref={ref}>
      <boxBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color="indianred" />
    </mesh>
  )
}

function InstancedSpheres({ number = 100 }) {
  const [ref] = useSphere(index => ({ mass: 1, position: [0, 0, index + 10], args: 0.5 }))
  return (
    <instancedMesh ref={ref} args={[null, null, number]}>
      <sphereBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color="peachpuff" />
    </instancedMesh>
  )
}

function App() {
  return (
    <Physics gravity={[0, 0, -10]}>
      <Plane />
      <Box />
      <InstancedSpheres />
    </Physics>
  )
}
```

## Exports

```jsx
function Physics({ children, step, gravity, tolerance, }: PhysicsProps): React.ReactNode
function usePlane(fn: PlaneFn, deps?: any[]): Api
function useBox(fn: BoxFn, deps?: any[]): Api
function useCylinder(fn: CylinderFn, deps?: any[]): Api
function useHeightfield(fn: HeightfieldFn, deps?: any[]): Api
function useParticle(fn: ParticleFn, deps?: any[]): Api
function useSphere(fn: SphereFn, deps?: any[]): Api
function useTrimesh(fn: TrimeshFn, deps?: any[]): Api
```

## Returned api

```jsx
type Api = [React.MutableRefObject<THREE.Object3D | undefined>, ({
  setPosition: (x: number, y: number, z: number) => void
  setRotation: (x: number, y: number, z: number) => void
  setPositionAt: (index: number, x: number, y: number, z: number) => void
  setRotationAt: (index: number, x: number, y: number, z: number) => void
} | undefined)]
```

## Props

```jsx
type PhysicsProps = {
  children: React.ReactNode
  gravity?: number[]
  tolerance?: number
  step?: number
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
  args?: [number[][], number[][]] // vertices: [[x, y, z], ...], faces: [[a, b, c], ...]
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
