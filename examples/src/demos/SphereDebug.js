import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Debug, Physics, useSphere, usePlane } from '@react-three/cannon'

function ScalableBall() {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: 1,
    position: [0, 5, 0],
  }))

  return (
    <mesh castShadow receiveShadow ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="blue" transparent opacity={0.5} />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ type: 'Static', rotation: [-Math.PI / 2, 0, 0], ...props }))
  return (
    <mesh receiveShadow ref={ref}>
      <planeBufferGeometry args={[20, 20]} />
      <shadowMaterial color="#171717" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [-1, 2, 4] }}>
      <color attach="background" args={['#a6d1f6']} />
      <hemisphereLight />
      <directionalLight position={[5, 10, 5]} castShadow />
      <Physics>
        <Debug scale={1.1}>
          <Plane />
          <ScalableBall />
        </Debug>
      </Physics>
    </Canvas>
  )
}
