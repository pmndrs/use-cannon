import type { BoxProps, PlaneProps } from '@react-three/cannon'
import { Debug, Physics, useBox, usePlane } from '@react-three/cannon'
import { Box, OrbitControls, Plane } from '@react-three/drei'
import type { MeshStandardMaterialProps } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import type { FC } from 'react'
import { useState } from 'react'

type GroundProps = Pick<MeshStandardMaterialProps, 'color'> & PlaneProps

const Ground: FC<GroundProps> = ({ color, ...props }) => {
  const [ref] = usePlane(() => ({ ...props }))

  return (
    <Plane args={[1000, 1000]} ref={ref}>
      <meshStandardMaterial color={color} />
    </Plane>
  )
}

const Crate = (props: BoxProps) => {
  const [ref, api] = useBox(() => ({ args: [2, 1, 1], mass: 1, ...props }))

  return (
    <Box
      args={[2, 1, 1]}
      onClick={() => {
        api.applyImpulse([0, 5, 2], [0, -1, 0])
      }}
      ref={ref}
    >
      <meshNormalMaterial />
    </Box>
  )
}

const Scene = ({ isPaused = false }) => (
  <>
    <OrbitControls />

    <Physics gravity={[0, -10, 0]} isPaused={isPaused}>
      <Debug color="black" scale={1}>
        <Ground color="grey" position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]} />

        <Crate position={[2, 0, 0]} />
        <Crate position={[0, 0, 0]} />
        <Crate position={[-2, 0, 0]} />

        <Crate position={[2, 5, 0]} />
        <Crate position={[0, 5, 0]} />
        <Crate position={[-2, 5, 0]} />

        <Crate position={[2, 10, 0]} />
        <Crate position={[0, 10, 0]} />
        <Crate position={[-2, 10, 0]} />
      </Debug>
    </Physics>

    <ambientLight />
  </>
)

export default () => {
  const [isPaused, togglePaused] = useState(false)
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <div style={{ position: 'fixed', textAlign: 'center', width: '100%', zIndex: +1 }}>
        <button
          onClick={() => togglePaused((value) => !value)}
          style={{ fontSize: '20px', margin: '20px', padding: '8px' }}
        >
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>

      <Canvas camera={{ fov: 70, position: [0, 0, 3] }}>
        <Scene isPaused={isPaused} />
      </Canvas>
    </div>
  )
}
