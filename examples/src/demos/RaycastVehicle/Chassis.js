import React, { forwardRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useBox } from '@react-three/cannon'

// Model via KrStolorz on Sketchfab, CC-BY-4.0
// https://sketchfab.com/3d-models/low-poly-volkswagen-beetle-f680ad7e98e445eaafed1a70f2c53911
function Beetle(props) {
  const { nodes, materials } = useGLTF('/Beetle.glb')
  return (
    <group {...props} dispose={null}>
      <mesh castShadow material={materials['Black paint']} geometry={nodes.chassis_1.geometry} />
      <mesh castShadow material={materials.Rubber} geometry={nodes.chassis_2.geometry} />
      <mesh castShadow material={materials.Paint} geometry={nodes.chassis_3.geometry} />
      <mesh castShadow material={materials.Underbody} geometry={nodes.chassis_4.geometry} />
      <mesh castShadow material={materials.Chrom} geometry={nodes.chassis_5.geometry} />
      <mesh castShadow material={materials['Interior (dark)']} geometry={nodes.chassis_6.geometry} />
      <mesh castShadow material={materials['Interior (light)']} geometry={nodes.chassis_7.geometry} />
      <mesh castShadow material={materials.Reflector} geometry={nodes.chassis_8.geometry} />
      <mesh material={materials.Glass} geometry={nodes.chassis_9.geometry} />
      <mesh castShadow material={materials.Steel} geometry={nodes.chassis_10.geometry} />
      <mesh castShadow material={materials['Black plastic']} geometry={nodes.chassis_11.geometry} />
      <mesh material={materials.Headlight} geometry={nodes.chassis_12.geometry} />
      <mesh castShadow material={materials['Reverse lights']} geometry={nodes.chassis_13.geometry} />
      <mesh castShadow material={materials['Orange plastic']} geometry={nodes.chassis_14.geometry} />
      <mesh castShadow material={materials['Tail lights']} geometry={nodes.chassis_15.geometry} />
      <mesh castShadow material={materials['License Plate']} geometry={nodes.chassis_16.geometry} />
    </group>
  )
}

useGLTF.preload('/Beetle.glb')

// The vehicle chassis
const Chassis = forwardRef((props, ref) => {
  const boxSize = [1.7, 1, 4] // roughly the cars's visual dimensions
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
      <Beetle position={[0, -0.6, 0]} />
    </mesh>
  )
})

export default Chassis
