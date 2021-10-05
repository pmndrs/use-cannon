import { useState, useEffect } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { Physics, useSphere, useTrimesh } from '@react-three/cannon'
import { OrbitControls, TorusKnot, useGLTF } from '@react-three/drei'
import create from 'zustand'

import type { SphereProps, TrimeshProps } from '@react-three/cannon'
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'
import type { BufferGeometry } from 'three'

type Store = {
  isPaused: boolean
  pause: () => void
  play: () => void
}

const useStore = create<Store>((set) => ({
  isPaused: false,
  pause: () => set({ isPaused: true }),
  play: () => set({ isPaused: false }),
}))

function Controls() {
  const { isPaused, pause, play } = useStore()
  return (
    <div>
      <span>Paused? {isPaused ? 'Yes' : 'No'}</span> <br /> <br />
      <button onClick={pause}>pause</button>
      <button onClick={play}>resume</button>
    </div>
  )
}

const WeirdCheerio = ({ args = [0.1], position }: Pick<SphereProps, 'args' | 'position'>) => {
  const [ref] = useSphere(() => ({ args, mass: 1, position }))
  const [radius] = args
  return (
    <TorusKnot ref={ref} args={[radius, radius / 2]}>
      <meshNormalMaterial />
    </TorusKnot>
  )
}

type BowlGLTF = GLTF & {
  nodes: {
    bowl: {
      geometry: BufferGeometry & {
        index: ArrayLike<number>
      }
    }
  }
}

const Bowl = ({ rotation }: Pick<TrimeshProps, 'rotation'>) => {
  const { nodes } = useGLTF('/bowl.glb') as BowlGLTF
  const geometry = nodes.bowl.geometry
  const vertices = geometry.attributes.position.array
  const indices = geometry.index.array

  const [hovered, setHover] = useState(false)
  const { isPaused } = useStore()

  const [ref] = useTrimesh(() => ({
    mass: 0,
    rotation,
    args: [vertices, indices],
  }))

  useEffect(() => {
    if (!isPaused) invalidate()
  }, [isPaused])

  return (
    <mesh
      ref={ref}
      geometry={nodes.bowl.geometry}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}>
      <meshStandardMaterial color={'white'} wireframe={hovered} />
    </mesh>
  )
}

export default () => (
  <>
    <Canvas shadows frameloop="demand">
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.3} />
      <pointLight castShadow intensity={0.8} position={[100, 100, 100]} />
      <OrbitControls />
      <Physics shouldInvalidate={false}>
        <Bowl rotation={[0, 0, 0]} />
        <WeirdCheerio position={[0.3, 11, 0]} />
        <WeirdCheerio position={[0, 10, 0]} />
        <WeirdCheerio position={[0.4, 9, 0.7]} />
        <WeirdCheerio position={[0.2, 13, 1]} />
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
        <Controls />
      </pre>
    </div>
  </>
)
