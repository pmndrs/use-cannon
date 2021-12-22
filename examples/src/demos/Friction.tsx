import React from 'react'
import { Canvas } from '@react-three/fiber'
import type { BoxProps, PlaneProps, Triplet } from '@react-three/cannon'
import { Physics, useContactMaterial, usePlane, useBox } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'

function Box({ color = 'white', ...props }: { color?: string } & BoxProps) {
  const boxSize: Triplet = [1, 1, 1]
  const [ref] = useBox(() => ({ args: boxSize, mass: 10, ...props }))
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry args={boxSize} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}

function Plane(props: PlaneProps) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[10, 5]} />
      <meshStandardMaterial color="#A5F2F3" />
    </mesh>
  )
}

function PhysicsContent() {
  const groundMaterial = {
    name: 'ground',
    friction: 0.5,
  }
  const slipperyMaterial = {
    name: 'slippery',
    friction: 0,
  }
  const boxMaterial = 'box'

  useContactMaterial(groundMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
  })

  useContactMaterial(boxMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
  })

  useContactMaterial(groundMaterial, slipperyMaterial, {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
  })

  return (
    <>
      <Box material={slipperyMaterial} position={[-2, 2, 0.25]} color="royalblue" />
      <Box material={boxMaterial} position={[0, 2, 0]} color="salmon" />
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
