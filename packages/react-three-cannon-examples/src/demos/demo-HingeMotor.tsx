import type { BoxProps, HingeConstraintOpts, PlaneProps, Triplet } from '@react-three/cannon'
import { Physics, useBox, useHingeConstraint, useLockConstraint, usePlane } from '@react-three/cannon'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { MeshStandardMaterialProps, PlaneBufferGeometryProps } from '@react-three/fiber'
import { Canvas, useFrame } from '@react-three/fiber'
import type { PropsWithChildren, RefObject } from 'react'
import {
  createContext,
  createRef,
  forwardRef,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { Group, Mesh, Object3D, PerspectiveCamera as Cam } from 'three'
import { Vector3 } from 'three'

function normalizeSize([px = 0, py = 0, pz = 0]): (scale: Triplet) => Triplet {
  return ([ox = 1, oy = 1, oz = 1]) => [px * ox, py * oy, pz * oz]
}

const GROUP_GROUND = 2 ** 0
const GROUP_BODY = 2 ** 1

type OurPlaneProps = Pick<PlaneBufferGeometryProps, 'args'> & Pick<PlaneProps, 'position' | 'rotation'>

function Plane({ args, ...props }: OurPlaneProps) {
  const [ref] = usePlane(
    () => ({ collisionFilterGroup: GROUP_GROUND, type: 'Static', ...props }),
    useRef<Group>(null),
  )
  return (
    <group ref={ref}>
      <mesh>
        <planeBufferGeometry args={args} />
        <meshBasicMaterial color="#ffb385" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry args={args} />
        <shadowMaterial color="lightsalmon" />
      </mesh>
    </group>
  )
}

const ref = createRef<Object3D>()
const context = createContext<[bodyRef: RefObject<Object3D>, props: BoxShapeProps]>([ref, {}])

type ConstraintPartProps = {
  config?: HingeConstraintOpts
  enableMotor?: boolean
  motorSpeed?: number
  parentPivot?: Triplet
  pivot?: Triplet
} & BoxProps &
  BoxShapeProps

const ConstraintPart = forwardRef<Mesh, PropsWithChildren<ConstraintPartProps>>(
  (
    {
      config = {},
      enableMotor,
      motorSpeed = 7,
      color,
      children,
      pivot = [0, 0, 0],
      parentPivot = [0, 0, 0],
      ...props
    },
    ref,
  ) => {
    const parent = useContext(context)

    const normParentPivot = parent && parent[1].args ? normalizeSize(parent[1].args) : () => undefined
    const normPivot = props.args ? normalizeSize(props.args) : () => undefined

    const [bodyRef] = useBox(
      () => ({
        collisionFilterGroup: GROUP_BODY,
        collisionFilterMask: GROUP_GROUND,
        linearDamping: 0.4,
        mass: 1,
        ...props,
      }),
      ref,
    )

    const [, , hingeApi] = useHingeConstraint(bodyRef, parent[0], {
      axisA: [0, 0, 1],
      axisB: [0, 0, 1],
      collideConnected: false,
      pivotA: normPivot(pivot),
      pivotB: normParentPivot(parentPivot),
      ...config,
    })

    useEffect(() => {
      if (enableMotor) {
        hingeApi.enableMotor()
      } else {
        hingeApi.disableMotor()
      }
    }, [enableMotor])

    useEffect(() => {
      hingeApi.setMotorSpeed(motorSpeed)
    }, [motorSpeed])

    return (
      <context.Provider value={[bodyRef, props]}>
        <BoxShape ref={bodyRef} {...props} color={color} />
        {children}
      </context.Provider>
    )
  },
)

type BoxShapeProps = Pick<MeshStandardMaterialProps, 'color' | 'opacity' | 'transparent'> &
  Pick<BoxProps, 'args'>
const BoxShape = forwardRef<Mesh, PropsWithChildren<BoxShapeProps>>(
  ({ args = [1, 1, 1], children, color = 'white', opacity = 1, transparent = false, ...props }, ref) => (
    <mesh receiveShadow castShadow ref={ref} {...props}>
      <boxBufferGeometry args={args} />
      <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
      {children}
    </mesh>
  ),
)

const Robot = forwardRef<Mesh>((_, legsLeftRef) => {
  const [motorSpeed, setMotorSpeed] = useState(7)

  const legsRightRef = useRef<Mesh>(null)

  useLockConstraint(legsRightRef, legsLeftRef, {})

  return (
    <group onPointerDown={() => setMotorSpeed(2)} onPointerUp={() => setMotorSpeed(7)}>
      <Legs ref={legsLeftRef} delay={1000} bodyDepth={3} motorSpeed={motorSpeed} />
      <Legs ref={legsRightRef} motorSpeed={motorSpeed} />
    </group>
  )
})

type LegsProps = {
  bodyDepth?: number
  delay?: number
} & Pick<ConstraintPartProps, 'motorSpeed'>

const Legs = forwardRef<Mesh, LegsProps>(({ bodyDepth = 0, delay = 0, motorSpeed = 7 }, bodyRef) => {
  const horizontalRef = useRef<Mesh>(null)
  const frontLegRef = useRef<Mesh>(null)
  const frontUpperLegRef = useRef<Mesh>(null)
  const backLegRef = useRef<Mesh>(null)
  const partDepth = 0.3
  const bodyWidth = 10
  const bodyHeight = 2
  const legLength = 6
  const size3 = normalizeSize([1, 3, partDepth])
  const size5 = normalizeSize([1, 5, partDepth])
  const size10 = normalizeSize([1, 10, partDepth])

  // Hinge constraints for triangulations
  useHingeConstraint(frontUpperLegRef, frontLegRef, {
    axisA: [0, 0, 1],
    axisB: [0, 0, 1],
    collideConnected: false,
    pivotA: size3([0, 0.5, 0.5]),
    pivotB: size5([0, 0.5, -0.5]),
  })

  useHingeConstraint(backLegRef, horizontalRef, {
    axisA: [0, 0, 1],
    axisB: [0, 0, 1],
    collideConnected: false,
    pivotA: size5([0, 0.5, 0.5]),
    pivotB: size10([0, 0.5, -0.5]),
  })

  const [isWalking, setIsWalking] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setIsWalking(true), delay)

    return () => clearTimeout(t)
  }, [])

  return (
    <group>
      {/* Body */}
      <ConstraintPart
        ref={bodyRef}
        mass={1}
        args={[bodyHeight, bodyWidth, bodyDepth ? bodyDepth + partDepth * 3 : 0]}
        rotation={[0, 0, Math.PI / 2]}
        position={[0, 0, bodyDepth]}
        transparent={!bodyDepth}
        opacity={Number(!!bodyDepth)}
      >
        {/* Upper front leg */}
        <ConstraintPart
          ref={frontUpperLegRef}
          args={[1, 3, partDepth]}
          position={[-2, 0.5, bodyDepth]}
          rotation={[0, 0, Math.PI / 3]}
          pivot={[0, -0.5, -0.5]}
          parentPivot={[0, 0.2, 0.5]}
          color="#85ffb3"
        />
        {/* Crank */}
        <ConstraintPart
          enableMotor={isWalking} // Motor enabled here
          motorSpeed={motorSpeed}
          args={[0.5, 1, partDepth]}
          position={[bodyWidth * -0.5, -1.5 / 2, bodyDepth]}
          parentPivot={[0, 0.5, 0.5]}
          pivot={[0, 0.5, -0.5]}
          color="black"
        >
          {/* Front leg */}
          <ConstraintPart
            ref={frontLegRef}
            args={[1, legLength, partDepth]}
            position={[bodyWidth * -0.5, -1, bodyDepth]}
            rotation={[0, 0, Math.PI / -6]}
            parentPivot={[0, -0.5, 0.5]}
            pivot={[0, 0, -0.5]}
            color="#85b3ff"
          >
            {/* Horizontal bar */}
            <ConstraintPart
              ref={horizontalRef}
              parentPivot={[0, 0, 0.5]}
              pivot={[0, -0.5, -0.5]}
              args={[1, bodyWidth, partDepth]}
              position={[0, 0, bodyDepth]}
              color="#ff85b3"
              rotation={[0, 0, Math.PI / -2.5]}
            />
          </ConstraintPart>
        </ConstraintPart>

        {/* Back leg */}
        <ConstraintPart
          ref={backLegRef}
          args={[1, legLength, partDepth]}
          pivot={[0, -0, -1]}
          parentPivot={[-0.0, -0.5, 0.5]}
          position={[bodyWidth * 0.5, 0, bodyDepth]}
          rotation={[0, 0, Math.PI / 4]}
          color="#85b3ff"
        ></ConstraintPart>
      </ConstraintPart>
    </group>
  )
})

function Obstacles() {
  return (
    <>
      <ConstraintPart
        collisionFilterGroup={GROUP_GROUND}
        collisionFilterMask={GROUP_BODY | GROUP_GROUND}
        mass={4}
        args={[-30, -0.4, 30]}
        position={[-45, -4, 0]}
        rotation={[0, Math.PI / -4, 0]}
        color={'#ffb385'}
      />
      <ConstraintPart
        collisionFilterGroup={GROUP_GROUND}
        collisionFilterMask={GROUP_BODY | GROUP_GROUND}
        mass={4}
        args={[-15, -0.5, 15]}
        position={[-50, -2, 0]}
        rotation={[0, Math.PI / -1.25, 0]}
        color={'#dc9c76'}
      />
      <ConstraintPart
        collisionFilterGroup={GROUP_GROUND}
        collisionFilterMask={GROUP_BODY | GROUP_GROUND}
        mass={4}
        args={[-10, -0.5, 10]}
        position={[-45, 0, -5]}
        rotation={[0, Math.PI / 3, 0]}
        color={'#c58e6e'}
      />
    </>
  )
}

const v = new Vector3()

function Scene() {
  const cameraRef = useRef<Cam>(null)
  const robotRef = useRef<Mesh>(null)

  useFrame(() => {
    if (!cameraRef.current || !robotRef.current) return
    robotRef.current.getWorldPosition(v)
    cameraRef.current.lookAt(v)
  })

  return (
    <Suspense fallback={null}>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[-40, 10, 20]} />

      <hemisphereLight intensity={0.35} />
      <spotLight
        position={[20, 30, 10]}
        angle={Math.PI / 5}
        penumbra={1}
        intensity={1}
        distance={180}
        castShadow
        shadow-mapSize-width={256}
        shadow-mapSize-height={256}
      />
      <color attach="background" args={['#f6d186']} />

      <Physics iterations={80} gravity={[0, -40, 0]}>
        <Robot ref={robotRef} />

        <Obstacles />

        <Plane args={[120, 120]} position={[-20, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </Physics>
    </Suspense>
  )
}

const style = {
  color: 'white',
  fontSize: '1.2em',
  left: 50,
  position: 'absolute',
  top: 20,
} as const

export default () => {
  return (
    <>
      <Canvas shadows gl={{ alpha: false }}>
        <OrbitControls />
        <Scene />
      </Canvas>

      <div style={style}>
        <pre>* click to reduce speed</pre>
      </div>
    </>
  )
}
