import { forwardRef, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useSpring } from '@react-three/cannon'

import type { BoxProps, SphereProps, Triplet } from '@react-three/cannon'
import type { Object3D } from 'three'

const Box = forwardRef<Object3D, BoxProps>((props, ref) => {
  const args: Triplet = [1, 1, 1]
  useBox(
    () => ({
      mass: 1,
      args,
      linearDamping: 0.7,
      ...props,
    }),
    ref,
  )
  return (
    <mesh ref={ref}>
      <boxBufferGeometry args={args} />
      <meshNormalMaterial />
    </mesh>
  )
})

const Ball = forwardRef<Object3D, SphereProps>((props, ref) => {
  const [, { position }] = useSphere(() => ({ type: 'Kinematic', args: [0.5], ...props }), ref)
  useFrame(({ mouse: { x, y }, viewport: { height, width } }) =>
    position.set((x * width) / 2, (y * height) / 2, 0),
  )
  return (
    <mesh ref={ref}>
      <sphereBufferGeometry args={[0.5, 64, 64]} />
      <meshNormalMaterial />
    </mesh>
  )
})

const BoxAndBall = () => {
  const box = useRef<Object3D>(null)
  const ball = useRef<Object3D>(null)
  const [, , api] = useSpring(box, ball, { restLength: 2, stiffness: 100, damping: 1 })
  const [isDown, setIsDown] = useState(false)

  useEffect(() => api.setRestLength(isDown ? 0 : 2), [isDown])

  return (
    <group onPointerDown={() => setIsDown(true)} onPointerUp={() => setIsDown(false)}>
      <Box ref={box} position={[1, 0, 0]} />
      <Ball ref={ball} position={[-1, 0, 0]} />
    </group>
  )
}

export default () => {
  return (
    <>
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <color attach="background" args={['#171720']} />
        <Physics gravity={[0, -40, 0]} allowSleep={false}>
          <BoxAndBall />
        </Physics>
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 50,
          color: 'white',
          fontSize: '1.2em',
        }}
      >
        <pre>* click to tighten constraint</pre>
      </div>
    </>
  )
}
