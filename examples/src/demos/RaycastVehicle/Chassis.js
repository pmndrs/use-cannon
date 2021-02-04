import React, { forwardRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useBox } from '@react-three/cannon'

// Model via Renderbunny on Turbosquid, see Editorial license
// https://www.turbosquid.com/3d-models/cartoon-chrysler-car-3d-model-1496394
function Chrysler(props) {
  const { nodes, materials } = useGLTF('/crysler.glb')
  return (
    <mesh
      {...props}
      dispose={null}
      material={materials['Material.004']}
      geometry={nodes.Crysler.geometry}
      position={[0, 0.1, -0.01]}
    />
  )
}
useGLTF.preload('/Crysler.glb')

// The vehicle chassis
const Chassis = forwardRef((props, ref) => {
  const boxSize = [1.8, 1, 4] // roughly the Crysler's visual dimensions
  const [, api] = useBox(
    () => ({
      mass: props.weight || 500,
      rotation: props.rotation,
      angularVelocity: props.angularVelocity,
      allowSleep: false,
      args: boxSize,
      onCollide: (e) => console.log(`bonk`),
      ...props,
    }),
    ref
  )

  return (
    <mesh ref={ref} api={api}>
      <Chrysler castShadow />
    </mesh>
  )
})

export default Chassis
