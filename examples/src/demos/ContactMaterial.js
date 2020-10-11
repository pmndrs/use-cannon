import React from 'react'
import { Canvas } from 'react-three-fiber'
import { Physics, usePlane, useSphere } from '@react-three/cannon'

function Ball(props) {
  const [ref] = useSphere(() => ({ args: 0.5, mass: 1, ...props }))
  return (
    <mesh ref={ref}>
      <sphereBufferGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ mass: 0, ...props }))
  return (
    <mesh ref={ref}>
      <planeBufferGeometry args={[5, 5]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

export default () => (
  <Canvas camera={{ position: [3, 3, 3] }}>
    <pointLight position={[1, 2, 3]} />
    <Physics>
      <Ball position={[0, 2, 0]} />
      <Plane rotation={[-Math.PI / 2, 0, 0]} />
    </Physics>
  </Canvas>
)
