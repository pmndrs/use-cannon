import React from 'react'
import { Canvas } from '@react-three/fiber'
import type { BoxProps, PlaneProps, Triplet } from '@react-three/cannon'
import { Physics, useMaterial, usePlane, useBox } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'

function Box(props: BoxProps) {
  const boxSize: Triplet = [1, 1, 1]
  const [ref] = useBox(() => ({ args: boxSize, mass: 10, ...props }))
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry args={boxSize} />
      <meshLambertMaterial color="white" />
    </mesh>
  )
}

function Plane(props: PlaneProps) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[10, 5]} />
      <meshStandardMaterial color="lightsalmon" />
    </mesh>
  )
}

function PhysicsContent() {
  const groundMaterial = useMaterial(() => ({ friction: 0.5 }))
  const slipperyMaterial = useMaterial(() => ({ friction: 0 }))
  const regularMaterial = useMaterial(() => ({ friction: 0.6 }))

  return (
    <>
      <Box material={slipperyMaterial} position={[-1, 2, 0.5]} />
      <Box material={regularMaterial} position={[1, 2, 0]} />
      <Plane material={groundMaterial} rotation={[-Math.PI / 2, 0, 0]} />
    </>
  )
}

export default () => (
  <Canvas shadows camera={{ position: [0, 2, 6] }}>
    <OrbitControls />
    <pointLight position={[1, 2, 3]} castShadow />
    <ambientLight intensity={0.2} />
    <Physics gravity={[3, -9.81, 0]}>
      <PhysicsContent />
    </Physics>
  </Canvas>
)
