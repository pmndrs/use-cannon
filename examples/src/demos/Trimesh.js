import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, useSphere, useTrimesh } from '@react-three/cannon'
import { OrbitControls, TorusKnot, useGLTF } from '@react-three/drei'

const WeirdCheerio = (props) => {
  const [ref] = useSphere(() => ({ mass: 1, args: props.radius, ...props }))

  return (
    <TorusKnot ref={ref} args={[props.radius, props.radius / 2]}>
      <meshNormalMaterial />
    </TorusKnot>
  )
}

const Bowl = (props) => {
  const { nodes } = useGLTF('/bowl.glb')
  const geometry = nodes.bowl.geometry
  const vertices = geometry.attributes.position.array
  const indices = geometry.index.array

  const [hovered, setHover] = useState(false)

  const [ref] = useTrimesh(() => ({
    mass: 0,
    rotation: props.rotation,
    args: [vertices, indices],
  }))

  return (
    <mesh ref={ref} geometry={nodes.bowl.geometry} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} {...props}>
      <meshStandardMaterial color={'white'} wireframe={hovered} />
    </mesh>
  )
}

export default () => (
  <Canvas shadows>
    <color attach="background" args={['#171720']} />
    <ambientLight intensity={0.3} />
    <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
    <OrbitControls />
    <Physics>
      <Bowl rotation={[0, 0, 0]} />
      <WeirdCheerio radius={0.1} position={[0.3, 11, 0]} />
      <WeirdCheerio radius={0.1} position={[0, 10, 0]} />
      <WeirdCheerio radius={0.1} position={[0.4, 9, 0.7]} />
      <WeirdCheerio radius={0.1} position={[0.2, 13, 1]} />
    </Physics>
  </Canvas>
)
