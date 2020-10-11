import React from 'react'
import { Canvas } from 'react-three-fiber'
import { Physics, useContactMaterial, useMaterial, usePlane, useSphere } from '@react-three/cannon'
import { Material } from 'cannon-es'

// function Ball(props) {
// 	const [ref] = useSphere(() => ({ args: 0.5, mass: 1, ...props }))
// 	return (
// 		<mesh ref={ref}>
// 			<sphereBufferGeometry args={[0.5, 16, 16]} />
// 			<meshStandardMaterial />
// 		</mesh>
// 	)
// }

// function Plane(props) {
// 	const [ref] = usePlane(() => ({ mass: 0, ...props }))
// 	return (
// 		<mesh ref={ref}>
// 			<planeBufferGeometry args={[5, 5]} />
// 			<meshStandardMaterial color="hotpink" />
// 		</mesh>
// 	)
// }

function Stuff() {
  const sphereMat = useMaterial(() => 'groundMaterial')
  const planeMat = useMaterial(() => 'planeMat')
  console.log(sphereMat)
  console.log(planeMat)
  const [sphere] = useSphere(() => ({ args: 0.5, mass: 1, position: [0, 2, 0], material: sphereMat }))
  const [plane] = usePlane(() => ({ mass: 0, rotation: [-Math.PI / 2, 0, 0], material: planeMat }))
  useContactMaterial(sphereMat, planeMat, { restitution: 1 })
  return (
    <>
      <mesh ref={sphere}>
        <sphereBufferGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial />
      </mesh>
      <mesh ref={plane}>
        <planeBufferGeometry args={[5, 5]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </>
  )
}

export default () => (
  <Canvas camera={{ position: [3, 3, 3] }}>
    <pointLight position={[1, 2, 3]} />
    <Physics>
      <Stuff />
    </Physics>
  </Canvas>
)
