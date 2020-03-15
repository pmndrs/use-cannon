import * as THREE from 'three'
import React, { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { Physics, usePlane, useConvexPolyhedron } from 'use-cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Diamond(props) {
  const { nodes } = useLoader(GLTFLoader, '/diamond.glb')
  const [impact, set] = useState(0)
  const geo = useMemo(() => {
    let geo = new THREE.Geometry().fromBufferGeometry(nodes.Diamond.geometry)
    // Merge duplicate vertices resulting from glTF export.
    // Cannon assumes contiguous, closed meshes to work
    geo.mergeVertices()
    // Ensure loaded mesh is convex and create faces if necessary
    return new ConvexGeometry(geo.vertices)
  }, [nodes])

  const [ref] = useConvexPolyhedron(() => ({
    mass: 100,
    ...props,
    args: geo,
    onCollide: e => {
      set(e.contact.impactVelocity)
      setTimeout(() => set(0), 100)
    },
  }))
  return (
    <mesh castShadow receiveShadow ref={ref} geometry={geo} dispose={null}>
      <meshStandardMaterial attach="material" wireframe />
    </mesh>
  )
}

// A cone is a convex shape by definition
function Cone(props) {
  const geo = new THREE.ConeGeometry(1, 1, props.sides, 2)
  geo.mergeVertices()
  const [ref] = useConvexPolyhedron(() => ({ mass: 100, ...props, args: geo }))
  return (
    <mesh castShadow ref={ref} dispose={null}>
      <coneBufferGeometry attach="geometry" args={[1, 1, props.sides, 2]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[5, 5]} />
      <shadowMaterial attach="material" color="#171717" />
    </mesh>
  )
}

export default () => (
  <Canvas shadowMap sRGB gl={{ alpha: false }} camera={{ position: [-1, 1, 5], fov: 50 }}>
    <color attach="background" args={['lightpink']} />
    <hemisphereLight intensity={0.35} />
    <spotLight
      position={[5, 5, 5]}
      angle={0.3}
      penumbra={1}
      intensity={2}
      castShadow
      shadow-mapSize-width={256}
      shadow-mapSize-height={256}
    />
    <Suspense fallback={null}>
      <Physics>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Diamond position={[0, 5, 0]} rotation={[0.1, 0.1, 0.1]} />
        <Cone position={[0, 5, 0]} rotation={[0.1, 0.1, 0.1]} sides={6} />
        <Cone position={[1, 6, 0]} rotation={[0.5, 0.1, 0.1]} sides={8} />
      </Physics>
    </Suspense>
  </Canvas>
)
