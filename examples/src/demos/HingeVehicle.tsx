import { createContext, createRef, forwardRef, Suspense, useContext, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, Debug, usePlane, useBox, useHingeConstraint, useCylinder } from '@react-three/cannon'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'

import type { BoxProps, HingeConstraintOpts, PlaneProps, Triplet, CylinderArgs } from '@react-three/cannon'
import type { PlaneBufferGeometryProps, MeshStandardMaterialProps } from '@react-three/fiber'
import type { PropsWithChildren, RefObject } from 'react'
import type { Object3D, PerspectiveCamera as Cam } from 'three'

import { useControls } from './RaycastVehicle/useControls'
import { Pillar } from './RaycastVehicle/Pillar'

function normalizeSize([px = 0, py = 0, pz = 0]): (scale: Triplet) => Triplet {
  return ([ox = 1, oy = 1, oz = 1]) => [px * ox, py * oy, pz * oz]
}

const GROUP_GROUND = 2 ** 0
const GROUP_BODY = 2 ** 1

type OurPlaneProps = Pick<PlaneBufferGeometryProps, 'args'> & Pick<PlaneProps, 'position' | 'rotation'>

function Plane({ args, ...props }: OurPlaneProps) {
  const [ref] = usePlane(() => ({ type: 'Static', collisionFilterGroup: GROUP_GROUND, ...props }))
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

type ConstraintPartProps = PropsWithChildren<
  {
    config?: HingeConstraintOpts
    enableMotor?: boolean
    motorSpeed?: number
    parentPivot?: Triplet
    pivot?: Triplet
  } & Pick<BoxShapeProps, 'color'> &
    BoxProps
> &
  BoxShapeProps

const ConstraintPart = forwardRef<Object3D | null, ConstraintPartProps>(
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
      collideConnected: false,
      axisA: [0, 0, 1],
      axisB: [0, 0, 1],
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
const BoxShape = forwardRef<Object3D | null, BoxShapeProps>(
  ({ children, transparent = false, opacity = 1, color = 'white', args = [1, 1, 1], ...props }, ref) => (
    <mesh receiveShadow castShadow ref={ref} {...props}>
      <boxBufferGeometry args={args} />
      <meshStandardMaterial color={color} transparent={transparent} opacity={opacity} />
      {children}
    </mesh>
  ),
)

const HingeVehicle = forwardRef<Object3D>((_, robotRef) => {
  const controls = useControls()

  const motorSpeeds = [useRef(0), useRef(0), useRef(0), useRef(0)]

  const leftFrontWheelRef = useRef<Object3D>(null)
  const rightFrontWheelRef = useRef<Object3D>(null)
  const leftBackWheelRef = useRef<Object3D>(null)
  const rightBackWheelRef = useRef<Object3D>(null)

  // const bodyLength = 5
  // const bodyHeight = 0.5
  // const bodyWidth = 5 //3
  // const radius = 0.7

  // 10.24*9.06*2.56inch
  // 0.260096 m
  // 0.230124 m
  // 0.065024 m
  // 80mm mecanum wheel
  // 0.08 m
  const scale = 10
  const bodyLength = 0.260096 * scale
  const bodyHeight = 0.065024 * scale
  const bodyWidth = 0.230124 * scale
  const radius = 0.08 * scale

  const wheelSidePos = bodyWidth / 2 + 0.5
  const wheelHeightPos = -0.5

  useFrame(() => {
    const { forward, backward, left, right, brake } = controls.current

    const maxSpeed = 10
    const hasPower = !brake && (forward || backward || left || right)
    const isTurning = left || right
    // const isForward = forward && !backward
    const isBackward = backward && !forward
    const isLeft = !(left && !right)
    // const speed = forward || backward ? maxSpeed * (forward && !backward ? -1 : 1) : 0
    // const speed = hasPower ? (isForward ? 1 : -1) * maxSpeed : 0
    const speed = hasPower ? (isBackward ? -1 : 1) * maxSpeed : 0

    if (isTurning) {
      // Front Left
      motorSpeeds[0].current = isLeft ? -speed : speed
      // Front Right
      motorSpeeds[1].current = isLeft ? speed : -speed
      // Back Left
      motorSpeeds[2].current = isLeft ? -speed : speed
      // Back Right
      motorSpeeds[3].current = isLeft ? speed : -speed
    } else {
      // Front Left
      motorSpeeds[0].current = speed
      // Front Right
      motorSpeeds[1].current = speed
      // Back Left
      motorSpeeds[2].current = speed
      // Back Right
      motorSpeeds[3].current = speed
    }
  })

  return (
    <group>
      <ConstraintPart ref={robotRef} mass={1.5} type={'Dynamic'} args={[bodyLength, bodyHeight, bodyWidth]}>
        <Wheel
          ref={leftFrontWheelRef}
          leftSide
          radius={radius}
          bodyDepth={bodyWidth}
          motorSpeedRef={motorSpeeds[0]}
          position={[-bodyLength / 2, wheelHeightPos, wheelSidePos]}
        />
        <Wheel
          ref={rightFrontWheelRef}
          radius={radius}
          bodyDepth={bodyWidth}
          motorSpeedRef={motorSpeeds[1]}
          position={[-bodyLength / 2, wheelHeightPos, -wheelSidePos]}
        />
        <Wheel
          ref={leftBackWheelRef}
          leftSide
          radius={radius}
          bodyDepth={bodyWidth}
          motorSpeedRef={motorSpeeds[2]}
          position={[bodyLength / 2, wheelHeightPos, wheelSidePos]}
        />
        <Wheel
          ref={rightBackWheelRef}
          radius={radius}
          bodyDepth={bodyWidth}
          motorSpeedRef={motorSpeeds[3]}
          position={[bodyLength / 2, wheelHeightPos, -wheelSidePos]}
        />
      </ConstraintPart>
    </group>
  )
})

type WheelProps = {
  radius?: number
  position: Triplet
  leftSide?: boolean
  motorSpeedRef: React.MutableRefObject<number>
}

const Wheel = forwardRef<Object3D, WheelProps>(
  ({ motorSpeedRef, radius = 0.7, position, leftSide, ...props }, bodyRef) => {
    const parent = useContext(context)

    const zero: Triplet = [0, 0, 0]

    const leftAxis = new Vector3(0, 1, 0)
    const rightAxis = new Vector3(0, 1, 0)
    const leftFrontAxis = new Vector3(0, 0, -1)
    const rightFrontAxis = new Vector3(0, 0, 1)
    leftFrontAxis.normalize()
    rightFrontAxis.normalize()

    const [, , wheelApi] = useHingeConstraint(parent[0], bodyRef, {
      pivotA: position,
      axisA: (leftSide ? leftFrontAxis : rightFrontAxis).toArray(),
      pivotB: zero,
      axisB: (leftSide ? leftAxis : rightAxis).toArray(),
      collideConnected: false,
    })

    useEffect(() => {
      wheelApi.enableMotor()
      wheelApi.setMotorMaxForce(10)
    }, [wheelApi])

    useFrame(() => {
      const speed = motorSpeedRef.current
      if (speed === 0) {
        wheelApi.setMotorSpeed(0)
      } else {
        wheelApi.setMotorSpeed(speed)
      }
    })

    const deg90 = Math.PI / 2

    const args: CylinderArgs = [radius, radius, 0.5, 16]
    useCylinder(
      () => ({
        mass: 50,
        type: 'Dynamic',
        material: 'wheel',
        args,
        position,
        rotation: [deg90, 0, 0],
        collisionFilterGroup: GROUP_BODY,
        collisionFilterMask: GROUP_GROUND,
        ...props,
      }),
      bodyRef,
    )
    return (
      <mesh ref={bodyRef} castShadow>
        <cylinderBufferGeometry args={args} />
        <meshNormalMaterial />
      </mesh>
    )
  },
)

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

      <Pillar position={[-5, 1.5, -5]} userData={{ id: 'pillar-1' }} />
      <Pillar position={[0, 1.5, -5]} userData={{ id: 'pillar-2' }} />
      <Pillar position={[5, 1.5, -5]} userData={{ id: 'pillar-3' }} />
    </>
  )
}

const v = new Vector3()

function Scene() {
  const cameraRef = useRef<Cam>(null)
  const vehicleRef = useRef<Object3D>(null)

  useFrame(() => {
    if (!cameraRef.current || !vehicleRef.current) return
    vehicleRef.current.getWorldPosition(v)
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

      <Physics
        broadphase="SAP"
        defaultContactMaterial={{
          contactEquationRelaxation: 4,
          friction: 0.45, // 0.3, //1e-3,
          frictionEquationRelaxation: 4,
        }}
        allowSleep={false}
        iterations={100}
        gravity={[0, -9.82, 0]}
      >
        <Debug>
          <HingeVehicle ref={vehicleRef} />

          <Obstacles />

          <Plane args={[120, 120]} position={[-20, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        </Debug>
      </Physics>
    </Suspense>
  )
}

export default () => {
  return (
    <>
      <Canvas shadows gl={{ alpha: false }}>
        <OrbitControls />
        <Scene />
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
        <pre>* WASD to drive, space to brake</pre>
      </div>
    </>
  )
}
