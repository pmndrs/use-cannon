import { createContext, createRef, useContext } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useConeTwistConstraint } from '@react-three/cannon'

import type { PropsWithChildren } from 'react'
import type { Triplet } from '@react-three/cannon'
import type { Object3D } from 'three'

const parent = createContext(createRef<Object3D>())

const ChainLink = ({ children }: PropsWithChildren<{}>) => {
  const parentRef = useContext(parent)
  const chainSize: Triplet = [0.15, 1, 0.15]
  const [ref] = useBox(() => ({
    mass: 1,
    linearDamping: 0.8,
    args: chainSize,
  }))
  useConeTwistConstraint(parentRef, ref, {
    pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8,
  })
  return (
    <>
      <mesh ref={ref}>
        <cylinderBufferGeometry args={[chainSize[0], chainSize[0], chainSize[1], 8]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={ref}>{children}</parent.Provider>
    </>
  )
}

const Handle = ({ children, radius }: PropsWithChildren<{ radius: number }>) => {
  const [ref, { position }] = useSphere(() => ({ type: 'Static', args: [radius], position: [0, 0, 0] }))
  useFrame(({ mouse: { x, y }, viewport: { height, width } }) =>
    position.set((x * width) / 2, (y * height) / 2, 0),
  )
  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={ref}>{children}</parent.Provider>
    </group>
  )
}

const ChainScene = () => {
  return (
    <Canvas shadows camera={{ position: [0, 5, 20], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        <Handle radius={0.5}>
          <ChainLink>
            <ChainLink>
              <ChainLink>
                <ChainLink>
                  <ChainLink>
                    <ChainLink>
                      <ChainLink />
                    </ChainLink>
                  </ChainLink>
                </ChainLink>
              </ChainLink>
            </ChainLink>
          </ChainLink>
        </Handle>
      </Physics>
    </Canvas>
  )
}

export default ChainScene
