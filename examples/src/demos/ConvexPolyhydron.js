import * as THREE from 'three'
import React, { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { Physics, usePlane, useConvexPolyhedron } from 'use-cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Proposal(props) {
  const { nodes } = useLoader(GLTFLoader, '/diamond.glb')
  const [v, f] = useMemo(() => {
    const geo = new THREE.Geometry().fromBufferGeometry(nodes.Cylinder.geometry)
    return [geo.vertices.map((v, i) => [v.x, v.y, v.z]), geo.faces.map((f, i) => [f.a, f.b, f.c])]
  }, [])
  const [ref] = useConvexPolyhedron(() => ({
    mass: 100,
    ...props,
    // I would want to be able to pass this as before
    // args: [geo.vertices, geo.faces]
    args: [v, f], // instead of this?
  }))
  return (
    <mesh castShadow ref={ref} geometry={nodes.Cylinder.geometry} dispose={null}>
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ mass: 0, ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[5, 5]} />
      <shadowMaterial attach="material" color="#171717" />
    </mesh>
  )
}

export default () => (
  <Canvas
    shadowMap
    sRGB
    gl={{ alpha: false }}
    camera={{ position: [-1, 1, 5], fov: 50 }}
    onCreated={({ scene }) => {
      scene.background = new THREE.Color('lightpink')
    }}>
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
        <Proposal position={[0, 1, 0]} rotation={[0.1, 0.1, 0.1]} />
      </Physics>
    </Suspense>
  </Canvas>
)
