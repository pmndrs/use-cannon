import type { BoxProps, PlaneProps } from '@react-three/cannon'
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState } from 'react'

function BoxTrigger({ args, onCollide, position }: BoxProps) {
  const [ref] = useBox(() => ({ isTrigger: true, args, position, onCollide }))
  return (
    <mesh {...{ position, ref }}>
      <boxBufferGeometry args={args} />
      <meshStandardMaterial wireframe color="green" />
    </mesh>
  )
}

function Ball() {
  const [ref] = useSphere(() => ({
    args: [1],
    mass: 1,
    position: [0, 10, 0],
  }))
  return (
    <mesh castShadow receiveShadow ref={ref}>
      <sphereBufferGeometry args={[1, 16, 16]} />
      <meshLambertMaterial color="white" />
    </mesh>
  )
}

function Plane(props: PlaneProps) {
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
    <Canvas shadows camera={{ position: [-10, 15, 5], fov: 50 }}>
      <OrbitControls />
      <fog attach="fog" args={[bg, 10, 50]} />
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.1} />
      <spotLight position={[10, 10, 10]} angle={0.5} intensity={1} castShadow penumbra={1} />
      <Physics>
        <BoxTrigger
          args={[4, 1, 4]}
          onCollide={(e) => {
            console.log('Collision event on BoxTrigger', e)
            setbg('#fe4365')
          }}
          position={[0, 5, 0]}
        />
        <Ball />
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
      </Physics>
    </Canvas>
  )
}
