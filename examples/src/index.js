import * as THREE from 'three'
import ReactDOM from 'react-dom'
import React from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Physics, useBox, usePlane, useSphere } from 'use-cannon'
import './styles.css'

function Plane(props) {
  return (
    <mesh ref={usePlane(() => ({ mass: 0, ...props }))[0]} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshStandardMaterial attach="material" color="indianred" />
    </mesh>
  )
}

function Box() {
  const [ref, api] = useBox(() => ({ mass: 1000, args: [2, 2, 2] }))
  useFrame(state => {
    const t = state.clock.getElapsedTime()
    api.setPosition(Math.sin(t * 2) * 5, Math.cos(t * 2) * 5, 3)
  })
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry attach="geometry" args={[4, 4, 4]} />
      <meshStandardMaterial attach="material" color="white" side={THREE.DoubleSide} />
    </mesh>
  )
}

function InstancedSpheres({ number = 100 }) {
  return (
    <instancedMesh
      ref={
        useSphere((ref, index) => ({
          mass: 100,
          position: [Math.random() - 0.5, Math.random() - 0.5, index * 2],
          args: 1,
        }))[0]
      }
      castShadow
      args={[null, null, number]}>
      <sphereBufferGeometry attach="geometry" args={[1, 16, 16]} />
      <meshPhongMaterial attach="material" color="hotpink" />
    </instancedMesh>
  )
}

function Walls() {
  return (
    <>
      <Plane />
      <Plane position={[-6, 0, 0]} rotation={[0, 0.9, 0]} />
      <Plane position={[6, 0, 0]} rotation={[0, -0.9, 0]} />
      <Plane position={[0, 6, 0]} rotation={[0.9, 0, 0]} />
      <Plane position={[0, -6, 0]} rotation={[-0.9, 0, 0]} />
    </>
  )
}

ReactDOM.render(
  <Canvas
    concurrent
    shadowMap
    gl={{ alpha: false }}
    camera={{ position: [0, -12, 15] }}
    onCreated={({ gl, camera }) => {
      camera.lookAt(0, 0, 0)
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.outputEncoding = THREE.sRGBEncoding
    }}>
    <hemisphereLight intensity={0.35} />
    <spotLight position={[30, 0, 30]} angle={0.3} penumbra={1} intensity={2} castShadow />
    <Physics gravity={[0, 0, -15]}>
      <Walls />
      <Box />
      <InstancedSpheres number={100} />
    </Physics>
  </Canvas>,
  document.getElementById('root')
)
