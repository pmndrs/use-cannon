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
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, usePlane, useBox, useHingeConstraint, useCompoundBody } from '@react-three/cannon'
import type { BodyProps, ShapeType } from '@react-three/cannon'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'

import type { BoxProps, HingeConstraintOpts, PlaneProps, Triplet, CylinderArgs } from '@react-three/cannon'
import type { PlaneBufferGeometryProps, MeshStandardMaterialProps } from '@react-three/fiber'
import type { PropsWithChildren, RefObject } from 'react'
import type { Object3D, PerspectiveCamera as Cam } from 'three'

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

const fastSpeed = 2
const slowSpeed = 0.2
const GearTrain = forwardRef<Object3D>((_, robotRef) => {
  const [motorSpeed, setMotorSpeed] = useState(fastSpeed)

  const leftFrontWheelRef = useRef<Object3D>(null)
  const rightFrontWheelRef = useRef<Object3D>(null)
  const leftBackWheelRef = useRef<Object3D>(null)
  const rightBackWheelRef = useRef<Object3D>(null)

  const radius = 1
  const bodyLength = 10
  const bodyHeight = 2 //2.2
  const bodyWidth = 1.2

  const gearX = 1
  const gearY = 1
  const gearZ = 1

  return (
    <group onPointerDown={() => setMotorSpeed(slowSpeed)} onPointerUp={() => setMotorSpeed(fastSpeed)}>
      <ConstraintPart
        ref={robotRef}
        // mass={50}
        // type={'Dynamic'}
        mass={0}
        type={'Static'}
        args={[bodyLength, bodyHeight, bodyWidth]}
      >
        <Gear
          ref={leftFrontWheelRef}
          leftSide
          radius={radius}
          motorSpeed={motorSpeed}
          // segments={20}
          // segments={32}
          position={[gearX, gearY, gearZ]}
        />
        <Gear
          ref={rightFrontWheelRef}
          leftSide
          radius={radius}
          motorSpeed={0}
          // segments={32}
          position={[gearX - 2.25, gearY, gearZ]}
        />
        <Gear
          ref={leftBackWheelRef}
          leftSide
          radius={radius * 2}
          motorSpeed={0}
          // segments={32}
          position={[gearX - 5.5, gearY, gearZ]}
        />
        <Gear
          ref={rightBackWheelRef}
          leftSide
          radius={radius * 0.67}
          motorSpeed={0}
          // segments={10}
          position={[gearX + 1.95, gearY, gearZ]}
        />
      </ConstraintPart>
    </group>
  )
})

type GearProps = {
  radius?: number
  position: Triplet
  leftSide?: boolean
  // motorSpeedRef: React.MutableRefObject<number>
  motorSpeed: number
  segments?: number
}

// type Shape = BodyProps & CompoundBodyProps['shapes'][number]
type Shape = Omit<BodyProps, 'type'> & {
  type: ShapeType
}

const Gear = forwardRef<Object3D, GearProps>(
  ({ motorSpeed = 0, radius = 0.7, position, leftSide, segments = 16 }, bodyRef) => {
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
      if (motorSpeed) {
        wheelApi.enableMotor()
        wheelApi.setMotorSpeed(motorSpeed)
        // wheelApi.setMotorMaxForce(10)
      } else {
        wheelApi.setMotorSpeed(0)
        wheelApi.disableMotor()
      }
    }, [wheelApi, motorSpeed])

    const deg90 = Math.PI / 2

    // const segments = 10 //16
    const width = 0.5
    // const toothSize = 0.1 //0.05 //0.1
    // const pitchDiagram = 2.25 * radius
    // const outerDiagram = 2.5 * radius
    const pitchDiagram = 2 * radius + 0.25
    const outerDiagram = 2 * radius + 0.5
    const pitchWidth = 0.3
    const outerWidth = 0.07
    // segments = Math.floor(pitchDiagram / (pitchWidth* 10) * 11.1)
    segments = Math.floor(pitchDiagram * 3.2)
    const args: CylinderArgs = [radius, radius, width, Math.max(16, segments)]

    // inside diameter
    // pitch diameter
    // outside diameter
    // tooth width
    // tooth thickness
    // tooth count

    const teeth: Shape[] = new Array(segments)
      .fill(0)
      .map((_, i): Shape[] => {
        const angle = (2 * Math.PI * i) / segments
        return [
          {
            type: 'Box',
            position: [0, 0, 0],
            args: [outerDiagram, width, outerWidth],
            rotation: [0, angle, 0],
          },
          {
            type: 'Box',
            position: [0, 0, 0],
            args: [pitchDiagram, width, pitchWidth],
            rotation: [0, angle, 0],
          },
          //
          {
            type: 'Box',
            position: [0, 0, 0],
            args: [(outerDiagram + pitchDiagram) / 2, width, (pitchWidth + outerWidth) / 2],
            rotation: [0, angle, 0],
          },
        ]
      })
      .flat()
    // console.log('teeth', teeth)

    const shapes: Shape[] = [
      {
        type: 'Cylinder',
        position: [0, 0, 0],
        args,
      },
      ...teeth,
    ]
    console.log('shapes', shapes)

    // const [,gearApi] =
    useCompoundBody(
      () => ({
        mass: 1,
        position,
        rotation: [deg90, 0, 0],
        // collisionFilterGroup: GROUP_BODY,
        // collisionFilterMask: GROUP_GROUND,
        shapes,
      }),
      bodyRef,
    )

    // useCylinder(
    //   () => ({
    //     mass: 50,
    //     type: 'Dynamic',
    //     material: 'wheel',
    //     args,
    //     position,
    //     rotation: [deg90, 0, 0],
    //     collisionFilterGroup: GROUP_BODY,
    //     collisionFilterMask: GROUP_GROUND,
    //     ...props,
    //   }),
    //   bodyRef,
    // )

    // console.log('gearApi', gearApi)
    // useEffect(() => {
    //   return gearApi.angularVelocity.subscribe(v => {
    //     // console.log('angularVelocity', v)
    //   })
    // }, [gearApi])

    return (
      <group ref={bodyRef}>
        <mesh castShadow>
          <cylinderBufferGeometry args={args} />
          <meshNormalMaterial />
        </mesh>
        {teeth.map((tooth, toothIndex) => (
          <mesh castShadow key={toothIndex} position={tooth.position} rotation={tooth.rotation}>
            <boxBufferGeometry args={tooth.args as Triplet} />
            <meshNormalMaterial />
          </mesh>
        ))}
      </group>
    )
  },
)

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
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 2, 10]} />

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
        {/* <Debug> */}
        <GearTrain ref={vehicleRef} />
        <Plane args={[120, 120]} position={[-20, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        {/* </Debug> */}
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
        <pre>* click to reduce speed</pre>
      </div>
    </>
  )
}
