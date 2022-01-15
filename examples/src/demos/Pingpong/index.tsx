import { TextureLoader } from 'three'
import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Physics, useSphere, useBox, usePlane } from '@react-three/cannon'
import lerp from 'lerp'
import clamp from 'lodash-es/clamp'
import { GLTFLoader } from 'three-stdlib/loaders/GLTFLoader'
import { DRACOLoader } from 'three-stdlib/loaders/DRACOLoader'
import create from 'zustand'

import Text from './Text'
import pingSound from './resources/ping.mp3'
import earthImg from './resources/cross.jpg'

import type { BufferGeometry, Loader, Material, Object3D, Skeleton } from 'three'
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'

type State = {
  api: {
    pong: (velocity: number) => void
    reset: (welcome: boolean) => void
  }
  count: number
  welcome: boolean
}

const ping = new Audio(pingSound)
const useStore = create<State>((set) => ({
  api: {
    pong(velocity) {
      ping.currentTime = 0
      ping.volume = clamp(velocity / 20, 0, 1)
      ping.play()
      if (velocity > 4) set((state) => ({ count: state.count + 1 }))
    },
    reset: (welcome) => set((state) => ({ count: welcome ? state.count : 0, welcome })),
  },
  count: 0,
  welcome: true,
}))

type PingPongGLTF = GLTF & {
  materials: Record<'foam' | 'glove' | 'lower' | 'side' | 'upper' | 'wood', Material>
  nodes: Record<'Bone' | 'Bone003' | 'Bone006' | 'Bone010', {}> &
    Record<'mesh' | 'mesh_1' | 'mesh_2' | 'mesh_3' | 'mesh_4', { geometry: BufferGeometry }> & {
      arm: { geometry: BufferGeometry; skeleton: Skeleton }
    }
}

const extensions = (loader: GLTFLoader) => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco-gltf/')
  loader.setDRACOLoader(dracoLoader)
}

function Paddle() {
  const { nodes, materials } = useLoader<PingPongGLTF, '/pingpong.glb'>(
    GLTFLoader,
    '/pingpong.glb',
    extensions as (loader: Loader) => void,
  )
  const { pong } = useStore((state) => state.api)
  const welcome = useStore((state) => state.welcome)
  const count = useStore((state) => state.count)
  const model = useRef<Object3D>(null)
  const [ref, api] = useBox(() => ({
    args: [3.4, 1, 3],
    onCollide: (e) => pong(e.contact.impactVelocity),
    type: 'Kinematic',
  }))
  const values = useRef([0, 0])
  useFrame((state) => {
    values.current[0] = lerp(values.current[0], (state.mouse.x * Math.PI) / 5, 0.2)
    values.current[1] = lerp(values.current[1], (state.mouse.x * Math.PI) / 5, 0.2)
    api.position.set(state.mouse.x * 10, state.mouse.y * 5, 0)
    api.rotation.set(0, 0, values.current[1])
    if (!model.current) return
    model.current.rotation.x = lerp(model.current.rotation.x, welcome ? Math.PI / 2 : 0, 0.2)
    model.current.rotation.y = values.current[0]
  })

  return (
    <mesh ref={ref} dispose={null}>
      <group ref={model} position={[-0.05, 0.37, 0.3]} scale={[0.15, 0.15, 0.15]}>
        <Text rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 2]} count={count.toString()} />
        <group rotation={[1.88, -0.35, 2.32]} scale={[2.97, 2.97, 2.97]}>
          <primitive object={nodes.Bone} />
          <primitive object={nodes.Bone003} />
          <primitive object={nodes.Bone006} />
          <primitive object={nodes.Bone010} />
          <skinnedMesh
            castShadow
            receiveShadow
            material={materials.glove}
            material-roughness={1}
            geometry={nodes.arm.geometry}
            skeleton={nodes.arm.skeleton}
          />
        </group>
        <group rotation={[0, -0.04, 0]} scale={[141.94, 141.94, 141.94]}>
          <mesh castShadow receiveShadow material={materials.wood} geometry={nodes.mesh.geometry} />
          <mesh castShadow receiveShadow material={materials.side} geometry={nodes.mesh_1.geometry} />
          <mesh castShadow receiveShadow material={materials.foam} geometry={nodes.mesh_2.geometry} />
          <mesh castShadow receiveShadow material={materials.lower} geometry={nodes.mesh_3.geometry} />
          <mesh castShadow receiveShadow material={materials.upper} geometry={nodes.mesh_4.geometry} />
        </group>
      </group>
    </mesh>
  )
}

function Ball() {
  const map = useLoader(TextureLoader, earthImg)
  const [ref] = useSphere(() => ({ args: [0.5], mass: 1, position: [0, 5, 0] }))
  return (
    <mesh castShadow ref={ref}>
      <sphereBufferGeometry args={[0.5, 64, 64]} />
      <meshStandardMaterial map={map} />
    </mesh>
  )
}

function ContactGround() {
  const { reset } = useStore((state) => state.api)
  const [ref] = usePlane(() => ({
    onCollide: () => reset(true),
    position: [0, -10, 0],
    rotation: [-Math.PI / 2, 0, 0],
    type: 'Static',
  }))
  return <mesh ref={ref} />
}

const style = (welcome: boolean) =>
  ({
    color: 'white',
    display: welcome ? 'block' : 'none',
    fontSize: '1.2em',
    left: 50,
    position: 'absolute',
    top: 50,
  } as const)

export default function () {
  const welcome = useStore((state) => state.welcome)
  const { reset } = useStore((state) => state.api)

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 50, position: [0, 5, 12] }}
        onPointerMissed={() => welcome && reset(false)}
      >
        <color attach="background" args={['#171720']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[-10, -10, -10]} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <Physics
          iterations={20}
          tolerance={0.0001}
          defaultContactMaterial={{
            contactEquationRelaxation: 1,
            contactEquationStiffness: 1e7,
            friction: 0.9,
            frictionEquationRelaxation: 2,
            frictionEquationStiffness: 1e7,
            restitution: 0.7,
          }}
          gravity={[0, -40, 0]}
          allowSleep={false}
        >
          <mesh position={[0, 0, -10]} receiveShadow>
            <planeBufferGeometry args={[1000, 1000]} />
            <meshPhongMaterial color="#172017" />
          </mesh>
          <ContactGround />
          {!welcome && <Ball />}
          <Suspense fallback={null}>
            <Paddle />
          </Suspense>
        </Physics>
      </Canvas>
      <div style={style(welcome)}>* click anywhere to start</div>
    </>
  )
}
