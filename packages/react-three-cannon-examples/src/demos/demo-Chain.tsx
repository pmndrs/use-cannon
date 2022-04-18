import type { CylinderArgs, Triplet } from '@react-three/cannon'
import { Physics, useBox, useConeTwistConstraint, useCylinder, useSphere } from '@react-three/cannon'
import { Canvas, useFrame } from '@react-three/fiber'
import type { PropsWithChildren } from 'react'
import { createContext, createRef, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { Mesh, Object3D } from 'three'
import { Color } from 'three'

const maxMultiplierExamples = [0, 500, 1000, 1500, undefined] as const

function notUndefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

const parent = createContext({
  position: [0, 0, 0] as Triplet,
  ref: createRef<Object3D>(),
})

type ChainLinkProps = {
  args?: CylinderArgs
  color?: Color | string
  maxMultiplier?: number
}

function ChainLink({
  args = [0.5, 0.5, 2, 16],
  children,
  color = 'white',
  maxMultiplier,
}: PropsWithChildren<ChainLinkProps>): JSX.Element {
  const {
    position: [x, y, z],
    ref: parentRef,
  } = useContext(parent)

  const [, , height = 2] = args
  const position: Triplet = [x, y - height, z]

  const [ref] = useCylinder(
    () => ({
      args,
      linearDamping: 0.8,
      mass: 1,
      position,
    }),
    useRef<Mesh>(null),
  )

  useConeTwistConstraint(parentRef, ref, {
    angle: Math.PI / 8,
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    maxMultiplier,
    pivotA: [0, -height / 2, 0],
    pivotB: [0, height / 2, 0],
    twistAngle: 0,
  })

  return (
    <>
      <mesh ref={ref}>
        <cylinderBufferGeometry args={args} />
        <meshStandardMaterial color={color} />
      </mesh>
      <parent.Provider value={{ position, ref }}>{children}</parent.Provider>
    </>
  )
}

type ChainProps = {
  length: number
  maxMultiplier?: number
}

function Chain({ children, length, maxMultiplier }: PropsWithChildren<ChainProps>): JSX.Element {
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
          <ChainLink color={color} maxMultiplier={maxMultiplier}>
            {acc}
          </ChainLink>
        )
      }, children)}
    </>
  )
}

function PointerHandle({ children, size }: PropsWithChildren<{ size: number }>): JSX.Element {
  const position: Triplet = [0, 0, 0]
  const args: Triplet = [size, size, size * 2]

  const [ref, api] = useBox(() => ({ args, position, type: 'Kinematic' }), useRef<Mesh>(null))

  useFrame(({ mouse: { x, y }, viewport: { height, width } }) => {
    api.position.set((x * width) / 2, (y * height) / 2, 0)
  })

  return (
    <group>
      <mesh ref={ref}>
        <boxBufferGeometry args={args} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ position, ref }}>{children}</parent.Provider>
    </group>
  )
}

type StaticHandleProps = {
  position: Triplet
  radius: number
}

function StaticHandle({ children, position, radius }: PropsWithChildren<StaticHandleProps>): JSX.Element {
  const [ref] = useSphere(() => ({ args: [radius], position, type: 'Static' }), useRef<Mesh>(null))
  return (
    <group>
      <mesh ref={ref}>
        <sphereBufferGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial />
      </mesh>
      <parent.Provider value={{ position, ref }}>{children}</parent.Provider>
    </group>
  )
}

const style = {
  color: 'white',
  fontSize: '1.2em',
  left: 50,
  position: 'absolute',
  top: 20,
} as const

function ChainScene(): JSX.Element {
  const [resetCount, setResetCount] = useState(0)

  const reset = useCallback(() => {
    setResetCount((prev) => prev + 1)
  }, [])

  const separation = 4

  return (
    <>
      <Canvas shadows camera={{ fov: 50, position: [0, 5, 20] }} onPointerMissed={reset}>
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
      <div style={style}>
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
