import { createContext, createRef, useContext } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, useSphere, useBox, useConeTwistConstraint } from '@react-three/cannon'

import type { PropsWithChildren } from 'react'
import type { Triplet } from '@react-three/cannon'
import type { Object3D } from 'three'

const parent = createContext({
  ref: createRef<Object3D>(),
  pos: [0, 0, 0] as Triplet,
})

const ChainLink = ({ children, ...props }: PropsWithChildren<{}>) => {
  const { ref: parentRef, pos: parentPos } = useContext(parent)
  const chainSize: Triplet = [0.5, 2, 0.15]
  const pos: Triplet = [parentPos[0], parentPos[1] - chainSize[1], parentPos[2]]
  const [ref] = useBox(() => ({
    mass: 1,
    linearDamping: 0.8,
    args: chainSize,
    ...props,
    position: pos,
  }))
  useConeTwistConstraint(parentRef, ref, {
    pivotA: [0, -chainSize[1] / 2, 0],
    pivotB: [0, chainSize[1] / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8,
    maxMultiplier: 1000,
  })
  return (
    <>
      <mesh ref={ref}>
        <cylinderBufferGeometry args={[chainSize[0], chainSize[0], chainSize[1], 8]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ ref, pos }}>{children}</parent.Provider>
    </>
  )
}

const Handle = ({ children, radius }: PropsWithChildren<{ radius: number }>) => {
  const pos: Triplet = [5, 10, -10]
  const [ref] = useSphere(() => ({ type: 'Static', args: [radius], position: pos }))
  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ ref, pos }}>{children}</parent.Provider>
    </group>
  )
}

const Projectile = ({ radius }: { radius: number }) => {
  const { pos: parentPos } = useContext(parent)
  const position: Triplet = [-40, 10, parentPos[2]]
  const [ref] = useSphere(() => ({
    type: 'Dynamic',
    mass: 10,
    args: [radius],
    // position: [-40, 10, 0],
    position,
    velocity: [60, 0, 0],
  }))
  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial />
      </mesh>
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
          <Projectile radius={2.0} />
          <ChainLink>
            <ChainLink>
              <ChainLink>
                <ChainLink>
                  <ChainLink>
                    <ChainLink>
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
