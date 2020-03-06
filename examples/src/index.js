import * as THREE from 'three'
import ReactDOM from 'react-dom'
import React, { useMemo } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Physics, useBox, usePlane, useSphere } from '../../dist/index'
import niceColors from 'nice-color-palettes'
import './styles.css'

function Plane({ color, ...props }) {
  return (
    <mesh ref={usePlane(() => ({ mass: 0, ...props }))[0]} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshPhongMaterial attach="material" color={color} />
    </mesh>
  )
}

function Box() {
  const [ref, api] = useBox(() => ({ mass: 1, args: [2, 2, 2], isKinematic: true }))
  useFrame(state => {
    const t = state.clock.getElapsedTime()
    api.setPosition(Math.sin(t * 2) * 5, Math.cos(t * 2) * 5, 3)
    api.setRotation(Math.sin(t * 2), Math.cos(t * 2), 0)
  })
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxBufferGeometry attach="geometry" args={[4, 4, 4]} />
      <meshLambertMaterial attach="material" color="white" side={THREE.DoubleSide} />
    </mesh>
  )
}

function InstancedSpheres({ number = 100 }) {
  const [ref] = useSphere(index => ({
    mass: 1,
    position: [Math.random() - 0.5, Math.random() - 0.5, index * 2],
    args: 1,
  }))
  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new THREE.Color()
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[17][Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    return array
  }, [number])
  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[null, null, number]}>
      <sphereBufferGeometry attach="geometry" args={[1, 16, 16]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </sphereBufferGeometry>
      <meshLambertMaterial attach="material" vertexColors={THREE.VertexColors} />
    </instancedMesh>
  )
}

function Walls() {
  return (
    <>
      <Plane color={niceColors[17][4]} />
      <Plane color={niceColors[17][1]} position={[-6, 0, 0]} rotation={[0, 0.9, 0]} />
      <Plane color={niceColors[17][2]} position={[6, 0, 0]} rotation={[0, -0.9, 0]} />
      <Plane color={niceColors[17][3]} position={[0, 6, 0]} rotation={[0.9, 0, 0]} />
      <Plane color={niceColors[17][0]} position={[0, -6, 0]} rotation={[-0.9, 0, 0]} />
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
    <spotLight
      position={[30, 0, 30]}
      angle={0.3}
      penumbra={1}
      intensity={2}
      castShadow
      shadow-mapSize-width={256}
      shadow-mapSize-height={256}
    />
    <Physics gravity={[0, 0, -30]}>
      <Walls />
      <Box />
      <InstancedSpheres number={100} />
    </Physics>
  </Canvas>,
  document.getElementById('root')
)
