import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState } from 'react'

function BoxTrigger({ onCollide, size, position }) {
  const [ref] = useBox(() => ({ isTrigger: true, args: size, position, onCollide }))
  return (
    <mesh ref={ref} position={position}>
      <boxBufferGeometry args={size} />
      <meshStandardMaterial wireframe color="green" />
    </mesh>
  )
}

function Ball() {
  const [ref] = useSphere(() => ({
    mass: 1,
    position: [0, 10, 0],
    args: 1,
  }))
  return (
    <mesh castShadow receiveShadow ref={ref}>
      <sphereBufferGeometry args={[1, 16, 16]} />
      <meshLambertMaterial color="white" />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[100, 100]} />
      <shadowMaterial color="#171717" />
    </mesh>
  )
}

export default () => {
  const [bg, setbg] = useState('#171720')
  return (
    <Canvas shadows camera={{ position: [-10, 15, 5], material: { restitution: 10 }, fov: 50 }}>
      <OrbitControls />
      <fog attach="fog" args={[bg, 10, 50]} />
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.1} />
      <spotLight position={[10, 10, 10]} angle={0.5} intensity={1} castShadow penumbra={1} />
      <Physics>
        <BoxTrigger
          onCollide={(e) => {
            console.log('Collision event on BoxTrigger', e)
            setbg('#fe4365')
          }}
          position={[0, 5, 0]}
          size={[4, 1, 4]}
        />
        <Ball />
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
      </Physics>
    </Canvas>
  )
}
