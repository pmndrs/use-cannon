import * as THREE from 'three'
import React, { Suspense, useMemo, useState } from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { Physics, usePlane, useConvexPolyhedron } from 'use-cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry'

// Diamond model by Michael Hemingway (CC-BY-SA)
function Diamond(props) {
  // a note on this particular shape: though unlikely in real life,
  // should this diamond fall undisturbed and completely upright,
  // it might balance itself perfectly on its bottom vertex.
  const { nodes } = useLoader(GLTFLoader, '/diamond.glb')
  const [impact, set] = useState(0)
  const geo = useMemo(() => {
    let geo = new THREE.Geometry().fromBufferGeometry(nodes.Diamond.geometry)
    console.log('Diamond Vertices:', geo.vertices.length)
    // Merge duplicate vertices resulting from glTF export.
    // Cannon assumes contiguous, closed meshes to work
    geo.mergeVertices()
    console.log('Diamond Vertices after merge:', geo.vertices.length)
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
  console.log(geo)
  const [ref] = useConvexPolyhedron(() => ({ mass: 100, ...props, args: geo }))
  return (
    <mesh castShadow ref={ref} dispose={null}>
      <coneBufferGeometry attach="geometry" args={[1, 1, props.sides, 2]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

// ...And so is a cube!
function Cube(props) {
  const geo = new THREE.BoxGeometry(1, 1, 1)
  const [ref] = useConvexPolyhedron(() => ({ mass: 100, ...props, args: geo }))
  return (
    <mesh castShadow ref={ref} dispose={null} receiveShadow>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
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
      shadow-mapSize-width={1028}
      shadow-mapSize-height={1028}
    />
    <Suspense fallback={null}>
      <Physics iterations={40} tolerance={0.004}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Diamond position={[0.5, 2, 0]} rotation={[0, 0.1, 0.1]} />
        <Cube position={[0, 5, 0]} rotation={[0.1, 0.1, 0.1]} sides={6} />
        <Cone position={[1, 6, 0]} rotation={[0.1, 0.5, 0.1]} sides={8} />
        <Cone position={[-1, 9, 0]} rotation={[0.1, Math.PI / 3, 0.1]} />
      </Physics>
    </Suspense>
  </Canvas>
)
