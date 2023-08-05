import type { BoxProps, SphereProps, Triplet } from '@react-three/cannon'
import { Physics, useBox, useSphere, useSpring } from '@react-three/cannon'
import { Canvas, useFrame } from '@react-three/fiber'
import { forwardRef, useEffect, useRef, useState } from 'react'
import type { Mesh } from 'three'

const Box = forwardRef<Mesh, BoxProps>((props, fwdRef) => {
  const args: Triplet = [1, 1, 1]
  const [ref] = useBox(
    () => ({
      args,
      linearDamping: 0.7,
      mass: 1,
      ...props,
    }),
    fwdRef,
  )
  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshNormalMaterial />
    </mesh>
  )
})

const Ball = forwardRef<Mesh, SphereProps>((props, fwdRef) => {
  const [ref, { position }] = useSphere(() => ({ args: [0.5], type: 'Kinematic', ...props }), fwdRef)
  useFrame(({ mouse: { x, y }, viewport: { height, width } }) =>
    position.set((x * width) / 2, (y * height) / 2, 0),
  )
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 64, 64]} />
      <meshNormalMaterial />
    </mesh>
  )
})

const BoxAndBall = () => {
  const [box, ball, api] = useSpring(useRef<Mesh>(null), useRef<Mesh>(null), {
    damping: 1,
    restLength: 2,
    stiffness: 100,
  })
  const [isDown, setIsDown] = useState(false)

  useEffect(() => api.setRestLength(isDown ? 0 : 2), [isDown])

  return (
    <group onPointerDown={() => setIsDown(true)} onPointerUp={() => setIsDown(false)}>
      <Box ref={box} position={[1, 0, 0]} />
      <Ball ref={ball} position={[-1, 0, 0]} />
    </group>
  )
}

const style = {
  color: 'white',
  fontSize: '1.2em',
  left: 50,
  position: 'absolute',
  top: 20,
} as const

export default () => {
  return (
    <>
      <Canvas
        camera={{ fov: 50, position: [0, 0, 8] }}
        gl={{
          // todo: stop using legacy lights
          useLegacyLights: true,
        }}
      >
        <color attach="background" args={['#171720']} />
        <Physics gravity={[0, -40, 0]} allowSleep={false}>
          <BoxAndBall />
        </Physics>
      </Canvas>
      <div style={style}>
        <pre>* click to tighten constraint</pre>
      </div>
    </>
  )
}
