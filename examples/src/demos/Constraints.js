import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useSpring } from '@react-three/cannon'

const Box = React.forwardRef((props, ref) => {
  const boxSize = [1, 1, 1]
  useBox(
    () => ({
      mass: 1,
      args: boxSize,
      linearDamping: 0.7,
      ...props,
    }),
    ref
  )
  return (
    <mesh ref={ref}>
      <boxBufferGeometry args={boxSize} />
      <meshNormalMaterial />
    </mesh>
  )
})

const Ball = React.forwardRef((props, ref) => {
  const [, { position }] = useSphere(() => ({ type: 'Kinetic', args: 0.5, ...props }), ref)
  useFrame((e) => position.set((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0))
  return (
    <mesh ref={ref}>
      <sphereBufferGeometry args={[0.5, 64, 64]} />
      <meshNormalMaterial />
    </mesh>
  )
})

const BoxAndBall = () => {
  const box = useRef()
  const ball = useRef()
  useSpring(box, ball, { restLength: 1, stiffness: 100, damping: 1 })
  return (
    <>
      <Box ref={box} position={[1, 0, 0]} />
      <Ball ref={ball} position={[-1, 0, 0]} />
    </>
  )
}

export default () => {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        <BoxAndBall />
      </Physics>
    </Canvas>
  )
}
