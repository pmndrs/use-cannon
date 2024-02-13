import type { BoxProps, PlaneProps } from '@react-three/cannon'
import { Physics, useBox, usePlane, useSphere } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Mesh } from 'three'

function BoxTrigger({ args, onCollide, position }: BoxProps) {
  const [ref] = useBox(() => ({ args, isTrigger: true, onCollide, position }), useRef<Mesh>(null))
  return (
    <mesh {...{ position, ref }}>
      <boxGeometry args={args} />
      <meshStandardMaterial wireframe color="green" />
    </mesh>
  )
}

function Ball() {
  const [ref] = useSphere(
    () => ({
      args: [1],
      mass: 1,
      position: [0, 10, 0],
    }),
    useRef<Mesh>(null),
  )
  return (
    <mesh castShadow receiveShadow ref={ref}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshLambertMaterial color="white" />
    </mesh>
  )
}

function Plane(props: PlaneProps) {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }), useRef<Mesh>(null))
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial color="#171717" />
    </mesh>
  )
}

export default () => {
  const [bg, setbg] = useState('#171720')
  return (
    <Canvas camera={{ fov: 50, position: [-10, 15, 5] }} shadows>
      <OrbitControls />
      <fog attach="fog" args={[bg, 10, 50]} />
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.1 * Math.PI} />
      <spotLight angle={0.5} castShadow decay={0} intensity={Math.PI} penumbra={1} position={[10, 10, 10]} />
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
