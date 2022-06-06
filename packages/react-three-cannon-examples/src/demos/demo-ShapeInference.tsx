import type { BodyProps, PlaneProps } from '@react-three/cannon'
import { Debug, Physics, useBody, usePlane } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import type { Group, Mesh } from 'three'

function BoundingSphere(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
    { type: 'Sphere' },
  )

  return (
    <mesh ref={ref} receiveShadow>
      <boxBufferGeometry args={[0.75, 0.75, 0.75]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function Sphere(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
  )

  return (
    <mesh ref={ref} receiveShadow>
      <sphereBufferGeometry args={[0.6]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function BoundingBox(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
    { type: 'Box' },
  )

  return (
    <mesh ref={ref} receiveShadow>
      <sphereBufferGeometry args={[0.5]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function Box(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
  )

  return (
    <mesh ref={ref} receiveShadow>
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function BoundingCylinder(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
    { type: 'Cylinder' },
  )

  return (
    <mesh ref={ref} receiveShadow>
      <sphereBufferGeometry args={[0.5]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function Cylinder(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
  )

  return (
    <mesh ref={ref} receiveShadow>
      <cylinderBufferGeometry args={[0.4, 0.6, 1.2, 10]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function ConvexPolyhedron(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Group>(null),
    { type: 'ConvexPolyhedron' },
  )

  return (
    <group ref={ref}>
      <mesh receiveShadow>
        <boxBufferGeometry args={[1.5, 0.5, 0.5]} />
        <meshNormalMaterial />
      </mesh>
      <mesh receiveShadow rotation={[0, Math.PI / 2, 0]}>
        <boxBufferGeometry args={[1.5, 0.5, 0.5]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

function Trimesh(props: BodyProps) {
  const [ref] = useBody(
    () => ({
      mass: 1,
      ...props,
    }),
    useRef<Mesh>(null),
    { type: 'Trimesh' },
  )

  return (
    <mesh ref={ref} receiveShadow>
      <torusKnotBufferGeometry args={[0.5, 0.15, 100, 100]} />
      <meshNormalMaterial />
    </mesh>
  )
}

function Plane(props: PlaneProps) {
  usePlane(() => ({ type: 'Static', ...props }))
  return null
}

function ShapeInference() {
  return (
    <>
      <Canvas shadows camera={{ fov: 50, position: [4, 7, 6] }}>
        <color attach="background" args={['#555']} />
        <ambientLight intensity={0.5} />
        <spotLight
          position={[15, 15, 15]}
          angle={0.3}
          penumbra={1}
          intensity={2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <Suspense fallback={null}>
          <Physics gravity={[0, -10, 0]}>
            <Debug color="white">
              <Box position={[-4, 4, -1]} />
              <Cylinder position={[-2, 6, -1]} />
              <Sphere position={[-0, 8, -1]} />
              <ConvexPolyhedron position={[2, 10, -1]} />
              <Trimesh position={[4, 12, -1]} rotation={[Math.PI / 2, 0, 0]} />

              <BoundingBox position={[-2, 14, 1]} />
              <BoundingSphere position={[0, 16, 1]} />
              <BoundingCylinder position={[2, 18, 1]} />

              <Plane rotation={[-Math.PI / 2, 0, 0]} />
            </Debug>
          </Physics>
        </Suspense>
        <OrbitControls />
      </Canvas>
    </>
  )
}

export default ShapeInference
