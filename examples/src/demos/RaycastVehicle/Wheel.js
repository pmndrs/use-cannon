import React, { forwardRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useCylinder } from '@react-three/cannon'

function WheelModel(props) {
  const { nodes, materials } = useGLTF('/wheel.glb')
  return (
    <mesh
      {...props}
      material={materials['Material.004']}
      geometry={nodes.Tire_front_L_3.geometry}
      dispose={null}
      rotation={[-1.57, 0, 0]}
      receiveShadow
      castShadow
    />
  )
}
useGLTF.preload('/Wheel.glb')

// A Wheel
const Wheel = forwardRef((props, ref) => {
  const size = props.radius || 0.7
  const wheelSize = [size, size, 0.5, 16]
  const isLeftSide = props.leftSide || false // mirrors geometry

  useCylinder(
    () => ({
      mass: 1,
      type: 'Kinematic',
      material: 'wheel',
      collisionFilterGroup: 0, // turn off collisions, or turn them on if you want to fly!
      // the rotation should be applied to the shape (not the body)
      args: wheelSize,
      ...props,
    }),
    ref
  )

  return (
    <mesh ref={ref}>
      <mesh rotation={[0, 0, ((isLeftSide ? -1 : 1) * Math.PI) / 2]} castShadow>
        <WheelModel />
      </mesh>
    </mesh>
  )
})

export default Wheel
