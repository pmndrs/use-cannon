import type { CompoundBodyProps, PlaneProps, Triplet } from '@react-three/cannon'
import { Debug, Physics, useCompoundBody, usePlane } from '@react-three/cannon'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'

function Plane(props: PlaneProps): JSX.Element {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }), useRef<Group>(null))
  return (
    <group ref={ref}>
      <mesh>
        <planeBufferGeometry args={[8, 8]} />
        <meshBasicMaterial color="#ffb385" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry args={[8, 8]} />
        <shadowMaterial color="lightsalmon" />
      </mesh>
    </group>
  )
}

type OurCompoundBodyProps = Pick<CompoundBodyProps, 'position' | 'rotation'> & {
  isTrigger?: boolean
  mass?: number
  setPosition?: (position: Triplet) => void
  setRotation?: (rotation: Triplet) => void
}

function CompoundBody({
  isTrigger,
  mass = 12,
  setPosition,
  setRotation,
  ...props
}: OurCompoundBodyProps): JSX.Element {
  const boxSize: Triplet = [1, 1, 1]
  const sphereRadius = 0.65
  const [ref, api] = useCompoundBody(
    () => ({
      isTrigger,
      mass,
      ...props,
      shapes: [
        { args: boxSize, position: [0, 0, 0], rotation: [0, 0, 0], type: 'Box' },
        { args: [sphereRadius], position: [1, 0, 0], rotation: [0, 0, 0], type: 'Sphere' },
      ],
    }),
    useRef<Group>(null),
  )

  useEffect(() => {
    if (setPosition) {
      return api.position.subscribe(setPosition)
    }
  }, [api, setPosition])

  useEffect(() => {
    if (setRotation) {
      return api.rotation.subscribe(setRotation)
    }
  }, [api, setRotation])

  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxBufferGeometry args={boxSize} />
        <meshNormalMaterial />
      </mesh>
      <mesh castShadow position={[1, 0, 0]}>
        <sphereBufferGeometry args={[sphereRadius, 16, 16]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

export default function (): JSX.Element {
  const [ready, set] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => set(true), 2000)
    return () => clearTimeout(timeout)
  }, [])

  const [copy, setCopy] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setCopy(true), 1000)
    return () => clearTimeout(timeout)
  }, [])

  const position = useRef<Triplet>([0, 0, 0])
  const setPosition = ([x, y, z]: Triplet) => {
    position.current = [x, y, z]
  }

  const rotation = useRef<Triplet>([0, 0, 0])
  const setRotation = ([x, y, z]: Triplet) => {
    rotation.current = [x, y, z]
  }

  return (
    <Canvas shadows gl={{ alpha: false }} camera={{ fov: 50, position: [-2, 1, 7] }}>
      <color attach="background" args={['#f6d186']} />
      <hemisphereLight intensity={0.35} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
        shadow-mapSize-width={1028}
        shadow-mapSize-height={1028}
      />
      <Physics iterations={6}>
        <Debug scale={1.1} color="black">
          <Plane rotation={[-Math.PI / 2, 0, 0]} />
          <CompoundBody position={[1.5, 5, 0.5]} rotation={[1.25, 0, 0]} />
          <CompoundBody
            position={[2.5, 3, 0.25]}
            rotation={[1.25, -1.25, 0]}
            setPosition={setPosition}
            setRotation={setRotation}
          />
          {ready && <CompoundBody position={[2.5, 4, 0.25]} rotation={[1.25, -1.25, 0]} />}
          {copy && (
            <CompoundBody isTrigger mass={0} position={position.current} rotation={rotation.current} />
          )}
        </Debug>
      </Physics>
    </Canvas>
  )
}
