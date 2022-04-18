import type { Triplet } from '@react-three/cannon'
import { Physics, useBox, useRaycastAll, useSphere } from '@react-three/cannon'
import { Html } from '@react-three/drei'
import type { GroupProps, Node, Object3DNode } from '@react-three/fiber'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Mesh, PerspectiveCamera } from 'three'
import { BufferGeometry, Line as ThreeLine, Vector3 } from 'three'
import { OrbitControls } from 'three-stdlib/controls/OrbitControls'

import { prettyPrint } from './prettyPrint'

extend({ OrbitControls })
extend({ ThreeLine })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControls: Node<OrbitControls, typeof OrbitControls>
      threeLine: Object3DNode<ThreeLine, typeof ThreeLine>
    }
  }
}

function Plane(props: GroupProps) {
  return (
    <group {...props}>
      <mesh>
        <planeBufferGeometry args={[8, 8]} />
        <meshBasicMaterial color="#FFD3A5" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry args={[8, 8]} />
        <shadowMaterial color="#f8cd7e" />
      </mesh>
    </group>
  )
}

type SphereProps = {
  position: Triplet
  radius: number
}

function Sphere({ radius, position }: SphereProps) {
  const [ref, api] = useSphere(() => ({ args: [radius], position, type: 'Static' }), useRef<Mesh>(null))
  useFrame(({ clock: { elapsedTime } }) => {
    api.position.set(position[0], position[1], Math.sin(elapsedTime / 3) * 2)
  })
  return (
    <mesh castShadow ref={ref}>
      <sphereBufferGeometry args={[radius, 32, 32]} />
      <meshNormalMaterial />
    </mesh>
  )
}

type CubeProps = {
  position: Triplet
  size: Triplet
}

function Cube({ size, position }: CubeProps) {
  const [ref, api] = useBox(() => ({ args: size, position, type: 'Static' }), useRef<Mesh>(null))
  useFrame(({ clock: { elapsedTime } }) => {
    api.position.set(Math.sin(elapsedTime / 2) * 2, position[1], position[2])
  })
  return (
    <mesh castShadow ref={ref} position={position}>
      <boxBufferGeometry args={size} />
      <meshNormalMaterial />
    </mesh>
  )
}

type RayProps = {
  from: Triplet
  setHit: (e: {}) => void
  to: Triplet
}

function Ray({ from, to, setHit }: RayProps) {
  useRaycastAll({ from, to }, setHit)
  const geometry = useMemo(() => {
    const points = [from, to].map((v) => new Vector3(...v))
    return new BufferGeometry().setFromPoints(points)
  }, [from, to])

  return (
    <threeLine geometry={geometry}>
      <lineBasicMaterial color="black" />
    </threeLine>
  )
}

function Text({ hit }: { hit: unknown }) {
  return (
    <Html center style={{ pointerEvents: 'none' }}>
      <pre>{prettyPrint(hit)}</pre>
    </Html>
  )
}

function Raycast() {
  const [hit, setHit] = useState({})

  return (
    <>
      <Ray from={[0, 0, 0]} to={[0, 1.5, 0]} setHit={setHit} />
      <Text hit={hit} />
    </>
  )
}

const Camera = () => {
  const cameraRef = useRef<PerspectiveCamera>(null)
  const controlsRef = useRef<OrbitControls>(null)
  const { gl, camera } = useThree()
  const set = useThree((state) => state.set)
  const size = useThree((state) => state.size)

  useLayoutEffect(() => {
    if (!cameraRef.current) return
    cameraRef.current.aspect = size.width / size.height
    cameraRef.current.updateProjectionMatrix()
  }, [size])

  useLayoutEffect(() => {
    const camera = cameraRef.current
    if (!camera) return
    set(() => ({ camera }))
  }, [])

  useFrame(() => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.updateMatrixWorld()
    controlsRef.current.update()
  })

  return (
    <>
      <perspectiveCamera ref={cameraRef} position={[0, -10, 10]} />
      <orbitControls
        autoRotate
        enableDamping
        ref={controlsRef}
        args={[camera, gl.domElement]}
        dampingFactor={0.2}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
      />
    </>
  )
}

export default () => (
  <Canvas shadows gl={{ alpha: false }}>
    <Camera />
    <color attach="background" args={['#fcb89d']} />
    <hemisphereLight intensity={0.35} />
    <spotLight
      position={[0, 10, 0]}
      angle={1}
      penumbra={0.5}
      intensity={2}
      castShadow
      shadow-mapSize-width={1028}
      shadow-mapSize-height={1028}
    />
    <Suspense fallback={null}>
      <Physics iterations={6}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Sphere radius={0.5} position={[0, 1.5, 0]} />
        <Cube size={[0.75, 0.75, 0.75]} position={[0, 1.5, 0]} />
        <Raycast />
      </Physics>
    </Suspense>
  </Canvas>
)
