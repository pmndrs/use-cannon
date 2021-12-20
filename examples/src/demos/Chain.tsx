import { createContext, createRef, useCallback, useContext, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, useSphere, useBox, useConeTwistConstraint, useCylinder } from '@react-three/cannon'

import type { PropsWithChildren } from 'react'
import type { Triplet, CylinderArgs } from '@react-three/cannon'
import type { Object3D } from 'three'
import { Color } from 'three'

const maxMultiplierExamples = [0, 500, 1000, 1500, undefined]

const parent = createContext({
  ref: createRef<Object3D>(),
  position: [0, 0, 0] as Triplet,
})

const ChainLink = ({
  children,
  args = [0.5, 0.5, 2, 16],
  maxMultiplier,
  color = 'white',
  ...props
}: PropsWithChildren<{
  args?: CylinderArgs
  maxMultiplier?: number
  color?: Color | string
}>) => {
  const { ref: parentRef, position: parentPos } = useContext(parent)
  const height = args[2] ?? 2
  const initialPosition: Triplet = [parentPos[0], parentPos[1] - height, parentPos[2]]
  const [ref] = useCylinder(() => ({
    mass: 1,
    linearDamping: 0.8,
    args,
    ...props,
    position: initialPosition,
  }))
  useConeTwistConstraint(parentRef, ref, {
    pivotA: [0, -height / 2, 0],
    pivotB: [0, height / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    twistAngle: 0,
    angle: Math.PI / 8,
    maxMultiplier,
  })
  return (
    <>
      <mesh ref={ref}>
        <cylinderBufferGeometry args={args} />
        <meshStandardMaterial color={color} />
      </mesh>
      <parent.Provider value={{ ref, position: initialPosition }}>{children}</parent.Provider>
    </>
  )
}

function Chain({
  maxMultiplier,
  length,
  children,
}: PropsWithChildren<{ maxMultiplier?: number; length: number }>) {
  const color = useMemo(() => {
    if (maxMultiplier === undefined) return 'white'
    const maxExample = Math.max(...maxMultiplierExamples.filter(notUndefined))
    const red = Math.floor(Math.min(100, (maxMultiplier / maxExample) * 100))
    return new Color(`rgb(${red}%, 0%, ${100 - red}%)`)
  }, [maxMultiplier])
  return (
    <>
      {Array.from({ length }).reduce((acc: React.ReactNode) => {
        return (
          <ChainLink maxMultiplier={maxMultiplier} color={color}>
            {acc}
          </ChainLink>
        )
      }, children)}
    </>
  )
}

function notUndefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

const PointerHandle = ({ children, size }: PropsWithChildren<{ size: number }>) => {
  const initialPosition: Triplet = [0, 0, 0]
  const args: Triplet = [size, size, size * 2]
  const [ref, { position }] = useBox(() => ({ type: 'Kinematic', args, position: initialPosition }))
  useFrame(({ mouse: { x, y }, viewport: { height, width } }) =>
    position.set((x * width) / 2, (y * height) / 2, 0),
  )
  return (
    <group>
      <mesh ref={ref}>
        <boxBufferGeometry args={args} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ ref, position: initialPosition }}>{children}</parent.Provider>
    </group>
  )
}

const StaticHandle = ({
  children,
  radius,
  position,
}: PropsWithChildren<{ radius: number; position: Triplet }>) => {
  const [ref] = useSphere(() => ({ type: 'Static', args: [radius], position }))
  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ ref, position }}>{children}</parent.Provider>
    </group>
  )
}

const ChainScene = () => {
  const [resetCount, setResetCount] = useState(0)
  const reset = useCallback(() => {
    setResetCount((prev) => prev + 1)
  }, [])
  const separation = 4
  return (
    <>
      <Canvas shadows camera={{ position: [0, 5, 20], fov: 50 }} onPointerMissed={reset}>
        <color attach="background" args={['#171720']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[-10, -10, -10]} />
        <spotLight position={[10, 10, 10]} angle={0.8} penumbra={1} intensity={1} castShadow />
        <Physics gravity={[0, -40, 0]} allowSleep={false}>
          <PointerHandle size={1.5}>
            <Chain length={7} />
          </PointerHandle>
          {maxMultiplierExamples.map((maxMultiplier, index) => (
            <StaticHandle
              key={`${resetCount}-${maxMultiplier}`}
              radius={1.5}
              position={[(maxMultiplierExamples.length * -separation) / 2 + index * separation, 8, 0]}
            >
              <Chain maxMultiplier={maxMultiplier} length={8} />
            </StaticHandle>
          ))}
        </Physics>
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 50,
          color: 'white',
          fontSize: '1.2em',
        }}
      >
        <pre>
          * move pointer to move the box
          <br />
          and break the chain constraints,
          <br />
          click to reset
        </pre>
      </div>
    </>
  )
}

export default ChainScene
