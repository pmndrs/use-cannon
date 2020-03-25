import React, { Suspense, useState } from 'react'
import { Canvas, useFrame, useThree, Dom } from 'react-three-fiber'
import { Physics, useSphere, useBox, useRaycastAll } from 'use-cannon'
import { Vector3 } from 'three'

function Plane(props) {
  return (
    <group {...props}>
      <mesh>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <meshBasicMaterial attach="material" color="#FFD3A5" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <shadowMaterial attach="material" color="#f8cd7e" />
      </mesh>
    </group>
  )
}

function Sphere({ position }) {
  const [ref, api] = useSphere(() => ({ type: 'Static', position }))
  useFrame(({ clock: { elapsedTime } }) => {
    api.position.set(Math.sin(elapsedTime / 2) * 2, position[1], position[2])
  })
  return (
    <mesh castShadow ref={ref}>
      <sphereBufferGeometry attach="geometry" args={[0.5, 32, 32]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Cube({ position }) {
  const [ref, api] = useBox(() => ({ type: 'Static', position }))
  useFrame(({ clock: { elapsedTime } }) => {
    api.position.set(Math.sin(elapsedTime / 2) * 2, position[1], position[2])
  })
  return (
    <mesh castShadow ref={ref} position={position}>
      <boxBufferGeometry attach="geometry" args={[0.5, 0.5, 0.5]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Ray({ from, to, setHit }) {
  useRaycastAll({ from, to }, (result) => setHit(result))
  return (
    <line>
      <geometry
        attach="geometry"
        vertices={[from, to].map((v) => new Vector3(...v))}
        onUpdate={(self) => (self.verticesNeedUpdate = true)}
      />
      <lineBasicMaterial attach="material" color="black" />
    </line>
  )
}

function Text({ hit, screenSize }) {
  return (
    <Dom position={[0, 0, 0]} center={true}>
      <pre>{JSON.stringify(hit, null, 2)}</pre>
    </Dom>
  )
}

function Raycast() {
  const [hit, setHit] = useState({})
  const { size } = useThree()

  return (
    <>
      <Ray from={[0, 0, 0]} to={[0, 1.5, 0]} setHit={setHit} />
      <Text hit={hit} screenSize={size} />
    </>
  )
}

export default () => (
  <Canvas shadowMap gl={{ alpha: false }} camera={{ position: [-4, 1, 5], fov: 50 }}>
    <color attach="background" args={['#fcb89d']} />
    <hemisphereLight intensity={0.35} />
    <spotLight
      position={[0, 10, 0]}
      angle={1}
      penumbra={0.5}
      intensity={2}
      castShadow
      shadow-mapSize-width={1028}
      shadow-mapSize-height={1028}
    />
    <Suspense fallback={null}>
      <Physics iterations={6}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Cube position={[0, 1.5, 0]} />
        <Raycast />
      </Physics>
    </Suspense>
  </Canvas>
)
