import React from 'react'
import { Canvas } from 'react-three-fiber'
import { Physics, useCylinder, usePlane } from '@react-three/cannon'
import { OrbitControls } from '@react-three/drei'

import Vehicle from './Vehicle'

function Plane(props) {
  const [ref] = usePlane(() => ({
    type: 'Static',
    material: 'ground',
    ...props,
  }))
  return (
    <group ref={ref}>
      <mesh>
        <planeBufferGeometry args={[15, 15]} />
        <meshBasicMaterial color="#ffb385" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry args={[15, 15]} />
        <shadowMaterial color="lightsalmon" />
      </mesh>
    </group>
  )
}

function Pillar(props) {
  const args = [0.7, 0.7, 5, 16]
  const [ref] = useCylinder(() => ({
    mass: 10,
    args,
    ...props,
  }))
  return (
    <mesh ref={ref} castShadow>
      <cylinderBufferGeometry args={args} />
      <meshNormalMaterial />
    </mesh>
  )
}

const defaultContactMaterial = {
  contactEquationRelaxation: 4,
  friction: 1e-3,
}

const VehicleScene = () => {
  return (
    <>
      <Canvas shadowMap camera={{ position: [0, 5, 20], fov: 50 }}>
        <OrbitControls />
        <color attach="background" args={['#171720']} />
        <ambientLight intensity={0.1} />
        <spotLight position={[10, 10, 10]} angle={0.3} intensity={1} castShadow penumbra={0.5} />
        <Physics broadphase="SAP" {...defaultContactMaterial} allowSleep>
          <Plane rotation={[-Math.PI / 2, 0, 0]} userData={{ id: 'floor' }} />
          <Vehicle
            position={[0, 5, 0]}
            rotation={[0, -Math.PI / 4, 0]}
            angularVelocity={[0, 0.5, 0]} // to get you rolling
            wheelRadius={0.3}
          />
          <Pillar position={[-5, 2.5, -5]} userData={{ id: 'pillar-1' }} />
          <Pillar position={[0, 2.5, -5]} userData={{ id: 'pillar-2' }} />
          <Pillar position={[5, 2.5, -5]} userData={{ id: 'pillar-3' }} />
        </Physics>
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 50,
          color: 'white',
          fontSize: '1.2em',
        }}>
        <pre>
          * WASD to drive, space to brake
          <br />r to reset
        </pre>
      </div>
    </>
  )
}

export default VehicleScene
