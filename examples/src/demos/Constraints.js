import React, { useRef } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Physics, useSphere, useBox, useSpring } from 'use-cannon'
import mergeRefs from 'react-merge-refs'

const Box = React.forwardRef((props, ref) => {
  const [box] = useBox(() => ({ mass: 1, args: [0.5, 0.5, 0.5], ...props }))
  return (
    <mesh ref={mergeRefs([box, ref])}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" />
    </mesh>
  )
})

const Ball = React.forwardRef((props, ref) => {
  const [ball, { setPosition }] = useSphere(() => ({ type: 'Static', mass: 1, args: 0.5, ...props }))
  useFrame(e => setPosition((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0))
  return (
    <mesh ref={mergeRefs([ball, ref])}>
      <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]} />
      <meshStandardMaterial attach="material" />
    </mesh>
  )
})

const BoxAndBall = () => {
  const box = useRef()
  const ball = useRef()
  useSpring(box, ball, { restLength: 1, stiffness: 100, damping: 2 })
  return (
    <>
      <Box ref={box} position={[1, 0, 0]} />
      <Ball ref={ball} position={[-1, 0, 0]} />
    </>
  )
}

export default () => {
  return (
    <Canvas shadowMap sRGB camera={{ position: [0, 5, 20], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        <BoxAndBall />
      </Physics>
    </Canvas>
  )
}
