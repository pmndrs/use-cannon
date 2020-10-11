import React from 'react'
import { Canvas } from 'react-three-fiber'
import { Physics, useContactMaterial, useMaterial, usePlane, useSphere } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'

function Sphere(props) {
  const [ref] = useSphere(() => ({ args: 0.5, mass: 10, ...props }))
  return (
    <mesh ref={ref} castShadow>
      <sphereBufferGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[5, 5]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

function PhysicsContent() {
  const groundMaterial = useMaterial()
  const ballMaterialA = useMaterial()
  const ballMaterialB = useMaterial()
  const ballMaterialC = useMaterial()
  useContactMaterial(ballMaterialA, groundMaterial, { friction: 0.0, restitution: 0.0 })
  useContactMaterial(ballMaterialB, groundMaterial, { friction: 0.0, restitution: 0.7 })
  useContactMaterial(ballMaterialC, groundMaterial, { friction: 0.0, restitution: 0.8 })
  return (
    <>
      <Sphere material={ballMaterialA} position={[-1.5, 2, 0]} />
      <Sphere material={ballMaterialB} position={[0, 2, 0]} />
      <Sphere material={ballMaterialC} position={[1.5, 2, 0]} />
      <Plane material={groundMaterial} rotation={[-Math.PI / 2, 0, 0]} />
    </>
  )
}

export default () => (
  <Canvas shadowMap camera={{ position: [0, 2, 6] }}>
    <OrbitControls />
    <pointLight position={[1, 2, 3]} castShadow />
    <ambientLight intensity={0.2} />
    <Physics gravity={[0, -10, 0]}>
      <PhysicsContent />
    </Physics>
  </Canvas>
)
