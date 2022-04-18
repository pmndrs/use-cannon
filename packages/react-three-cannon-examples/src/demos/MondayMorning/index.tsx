import type { ConeTwistConstraintOpts, PlaneProps, Triplet } from '@react-three/cannon'
import {
  Physics,
  useBox,
  useCompoundBody,
  useConeTwistConstraint,
  useCylinder,
  usePlane,
  usePointToPointConstraint,
  useSphere,
} from '@react-three/cannon'
import type {
  BoxBufferGeometryProps,
  MeshProps,
  MeshStandardMaterialProps,
  ThreeEvent,
} from '@react-three/fiber'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import type { ReactNode, RefObject } from 'react'
import {
  createContext,
  createRef,
  forwardRef,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { Group, Material, Mesh, Object3D, SpotLight } from 'three'
import type { GLTF } from 'three-stdlib/loaders/GLTFLoader'
import { GLTFLoader } from 'three-stdlib/loaders/GLTFLoader'

import type { ShapeName } from './createConfig'
import { createRagdoll } from './createConfig'

const { joints, shapes } = createRagdoll(4.8, Math.PI / 16, Math.PI / 16, 0)
const context = createContext<RefObject<Object3D>>(createRef<Object3D>())
const cursor = createRef<Mesh>()

const double = ([x, y, z]: Readonly<Triplet>): Triplet => [x * 2, y * 2, z * 2]

function useDragConstraint(child: RefObject<Object3D>) {
  const [, , api] = usePointToPointConstraint(cursor, child, { pivotA: [0, 0, 0], pivotB: [0, 0, 0] })
  // TODO: make it so we can start the constraint with it disabled
  useEffect(() => void api.disable(), [])
  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    //@ts-expect-error Investigate proper types here.
    e.target.setPointerCapture(e.pointerId)
    api.enable()
  }, [])
  const onPointerUp = useCallback(() => api.disable(), [])
  return { onPointerDown, onPointerUp }
}

type BoxProps = Omit<MeshProps, 'args'> &
  Pick<BoxBufferGeometryProps, 'args'> &
  Pick<MeshStandardMaterialProps, 'color' | 'opacity' | 'transparent'>

const Box = forwardRef<Mesh, BoxProps>(
  ({ args = [1, 1, 1], children, color = 'white', opacity = 1, transparent = false, ...props }, ref) => {
    return (
      <mesh castShadow receiveShadow ref={ref} {...props}>
        <boxBufferGeometry args={args} />
        <meshStandardMaterial color={color} opacity={opacity} transparent={transparent} />
        {children}
      </mesh>
    )
  },
)

type BodyPartProps = BoxProps & {
  config?: ConeTwistConstraintOpts
  name: ShapeName
  render?: ReactNode
}

function BodyPart({ children, config = {}, name, render, ...props }: BodyPartProps): JSX.Element {
  const { color, args, mass, position } = shapes[name]
  const scale = useMemo<Triplet>(() => double(args), [args])
  const parent = useContext(context)
  const [ref] = useBox(
    () => ({ args: [...args], linearDamping: 0.99, mass, position: [...position] }),
    useRef<Mesh>(null),
  )
  useConeTwistConstraint(ref, parent, config)
  const bind = useDragConstraint(ref)
  return (
    <context.Provider value={ref}>
      <Box castShadow receiveShadow {...props} {...bind} scale={scale} name={name} color={color} ref={ref}>
        {render}
      </Box>
      {children}
    </context.Provider>
  )
}

function Ragdoll(props: Pick<MeshProps, 'position'>) {
  const mouth = useRef<Mesh>(null)
  const eyes = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!eyes.current || !mouth.current) return
    eyes.current.position.y = Math.sin(clock.getElapsedTime() * 1) * 0.06
    mouth.current.scale.y = (1 + Math.sin(clock.getElapsedTime())) * 1.5
  })
  return (
    <BodyPart {...props} name={'upperBody'}>
      <BodyPart
        {...props}
        config={joints['neckJoint']}
        name={'head'}
        render={
          <>
            <group ref={eyes}>
              <Box
                args={[0.3, 0.01, 0.1]}
                color="black"
                opacity={0.8}
                position={[-0.3, 0.1, 0.5]}
                transparent
              />
              <Box
                args={[0.3, 0.01, 0.1]}
                color="black"
                opacity={0.8}
                position={[0.3, 0.1, 0.5]}
                transparent
              />
            </group>
            <Box
              args={[0.3, 0.05, 0.1]}
              color="#270000"
              opacity={0.8}
              position={[0, -0.2, 0.5]}
              ref={mouth}
              transparent
            />
          </>
        }
      />
      <BodyPart {...props} name={'upperLeftArm'} config={joints['leftShoulder']}>
        <BodyPart {...props} name={'lowerLeftArm'} config={joints['leftElbowJoint']} />
      </BodyPart>
      <BodyPart {...props} name={'upperRightArm'} config={joints['rightShoulder']}>
        <BodyPart {...props} name={'lowerRightArm'} config={joints['rightElbowJoint']} />
      </BodyPart>
      <BodyPart {...props} name={'pelvis'} config={joints['spineJoint']}>
        <BodyPart {...props} name={'upperLeftLeg'} config={joints['leftHipJoint']}>
          <BodyPart {...props} name={'lowerLeftLeg'} config={joints['leftKneeJoint']} />
        </BodyPart>
        <BodyPart {...props} name={'upperRightLeg'} config={joints['rightHipJoint']}>
          <BodyPart {...props} name={'lowerRightLeg'} config={joints['rightKneeJoint']} />
        </BodyPart>
      </BodyPart>
    </BodyPart>
  )
}

function Plane(props: PlaneProps) {
  const [ref] = usePlane(() => ({ ...props }), useRef<Mesh>(null))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#171720" />
    </mesh>
  )
}

function Chair() {
  const [ref] = useCompoundBody(
    () => ({
      mass: 1,
      position: [-6, 0, 0],
      shapes: [
        { args: [1.5, 1.5, 0.25], mass: 1, position: [0, 0, 0], type: 'Box' },
        { args: [1.5, 0.25, 1.5], mass: 1, position: [0, -1.75, 1.25], type: 'Box' },
        { args: [0.25, 1.5, 0.25], mass: 10, position: [5 + -6.25, -3.5, 0], type: 'Box' },
        { args: [0.25, 1.5, 0.25], mass: 10, position: [5 + -3.75, -3.5, 0], type: 'Box' },
        { args: [0.25, 1.5, 0.25], mass: 10, position: [5 + -6.25, -3.5, 2.5], type: 'Box' },
        { args: [0.25, 1.5, 0.25], mass: 10, position: [5 + -3.75, -3.5, 2.5], type: 'Box' },
      ],
      type: 'Dynamic',
    }),
    useRef<Group>(null),
  )
  const bind = useDragConstraint(ref)
  return (
    <group ref={ref} {...bind}>
      <Box position={[0, 0, 0]} scale={[3, 3, 0.5]} />
      <Box position={[0, -1.75, 1.25]} scale={[3, 0.5, 3]} />
      <Box position={[5 + -6.25, -3.5, 0]} scale={[0.5, 3, 0.5]} />
      <Box position={[5 + -3.75, -3.5, 0]} scale={[0.5, 3, 0.5]} />
      <Box position={[5 + -6.25, -3.5, 2.5]} scale={[0.5, 3, 0.5]} />
      <Box position={[5 + -3.75, -3.5, 2.5]} scale={[0.5, 3, 0.5]} />
    </group>
  )
}

interface CupGLTF extends GLTF {
  materials: {
    default: Material
    Liquid: Material
  }
  nodes: {
    'buffer-0-mesh-0': Mesh
    'buffer-0-mesh-0_1': Mesh
  }
}

function Mug() {
  const { nodes, materials } = useLoader(GLTFLoader, '/cup.glb') as CupGLTF
  const [ref] = useCylinder(
    () => ({
      args: [0.6, 0.6, 1, 16],
      mass: 1,
      position: [9, 0, 0],
      rotation: [Math.PI / 2, 0, 0],
    }),
    useRef<Group>(null),
  )
  const bind = useDragConstraint(ref)
  return (
    <group ref={ref} {...bind} dispose={null}>
      <group scale={[0.01, 0.01, 0.01]}>
        <mesh
          receiveShadow
          castShadow
          material={materials.default}
          geometry={nodes['buffer-0-mesh-0'].geometry}
        />
        <mesh
          receiveShadow
          castShadow
          material={materials.Liquid}
          geometry={nodes['buffer-0-mesh-0_1'].geometry}
        />
      </group>
    </group>
  )
}

function Table() {
  const [seat] = useBox(
    () => ({ args: [2.5, 0.25, 2.5], position: [9, -0.8, 0], type: 'Static' }),
    useRef<Mesh>(null),
  )
  const [leg1] = useBox(
    () => ({ args: [0.25, 2, 0.25], position: [7.2, -3, 1.8], type: 'Static' }),
    useRef<Mesh>(null),
  )
  const [leg2] = useBox(
    () => ({ args: [0.25, 2, 0.25], position: [10.8, -3, 1.8], type: 'Static' }),
    useRef<Mesh>(null),
  )
  const [leg3] = useBox(
    () => ({ args: [0.25, 2, 0.25], position: [7.2, -3, -1.8], type: 'Static' }),
    useRef<Mesh>(null),
  )
  const [leg4] = useBox(
    () => ({ args: [0.25, 2, 0.25], position: [10.8, -3, -1.8], type: 'Static' }),
    useRef<Mesh>(null),
  )
  return (
    <>
      <Box scale={[5, 0.5, 5]} ref={seat} />
      <Box scale={[0.5, 4, 0.5]} ref={leg1} />
      <Box scale={[0.5, 4, 0.5]} ref={leg2} />
      <Box scale={[0.5, 4, 0.5]} ref={leg3} />
      <Box scale={[0.5, 4, 0.5]} ref={leg4} />
      <Suspense fallback={null}>
        <Mug />
      </Suspense>
    </>
  )
}

const Lamp = () => {
  const light = useRef<SpotLight>(null)
  const [fixed] = useSphere(() => ({ args: [1], position: [0, 16, 0], type: 'Static' }), useRef<Mesh>(null))
  const [lamp] = useBox(
    () => ({
      angulardamping: 1.99,
      args: [1, 0, 5],
      linearDamping: 0.9,
      mass: 1,
      position: [0, 16, 0],
    }),
    useRef<Mesh>(null),
  )
  usePointToPointConstraint(fixed, lamp, { pivotA: [0, 0, 0], pivotB: [0, 2, 0] })
  const bind = useDragConstraint(lamp)
  return (
    <>
      <mesh ref={lamp} {...bind}>
        <coneBufferGeometry attach="geometry" args={[2, 2.5, 32]} />
        <meshStandardMaterial attach="material" />
        <pointLight intensity={10} distance={5} />
        <spotLight ref={light} position={[0, 20, 0]} angle={0.4} penumbra={1} intensity={0.6} castShadow />
      </mesh>
    </>
  )
}

const Cursor = () => {
  const [ref, api] = useSphere(() => ({ args: [0.5], position: [0, 0, 10000], type: 'Static' }), cursor)

  useFrame(({ mouse, viewport: { height, width } }) => {
    const x = mouse.x * width
    const y = (mouse.y * height) / 1.9 + -x / 3.5
    api.position.set(x / 1.4, y, 0)
  })

  return (
    <mesh ref={ref}>
      <sphereBufferGeometry args={[0.5, 32, 32]} />
      <meshBasicMaterial fog={false} depthTest={false} transparent opacity={0.5} />
    </mesh>
  )
}

export default () => (
  <Canvas
    camera={{ far: 100, near: 1, position: [-25, 20, 25], zoom: 25 }}
    orthographic
    shadows
    style={{ cursor: 'none' }}
  >
    <color attach="background" args={['#171720']} />
    <fog attach="fog" args={['#171720', 20, 70]} />
    <ambientLight intensity={0.2} />
    <pointLight position={[-10, -10, -10]} color="red" intensity={1.5} />
    <Physics iterations={15} gravity={[0, -200, 0]} allowSleep={false}>
      <Cursor />
      <Ragdoll position={[0, 0, 0]} />
      <Plane position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <Chair />
      <Table />
      <Lamp />
    </Physics>
  </Canvas>
)
