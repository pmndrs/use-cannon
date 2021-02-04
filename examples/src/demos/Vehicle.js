import React, { forwardRef, useEffect, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from 'react-three-fiber'
import { Physics, useBox, useCylinder, usePlane, useRaycastVehicle } from '@react-three/cannon'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// Extend will make OrbitControls available as a JSX element called orbitControls for us to use.
extend({ OrbitControls })

const CameraControls = () => {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls component.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls
  const {
    camera,
    gl: { domElement },
  } = useThree()
  // Ref to the controls, so that we can update them on every frame using useFrame
  const controls = useRef()
  useFrame((state) => controls.current.update())
  return <orbitControls ref={controls} args={[camera, domElement]} />
}

function Plane(props) {
  const [ref] = usePlane(() => ({
    type: 'Static',
    material: 'ground',
    ...props,
  }))
  return (
    <group ref={ref}>
      <mesh>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <meshBasicMaterial attach="material" color="#ffb385" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <shadowMaterial attach="material" color="lightsalmon" />
      </mesh>
    </group>
  )
}

// The vehicle chassis
const Chassis = forwardRef((props, ref) => {
  const boxSize = [1.2, 1, 4]
  // eslint-disable-next-line
  const [_, api] = useBox(
    () => ({
      // type: 'Kinematic',
      mass: 500,
      rotation: props.rotation,
      angularVelocity: props.angularVelocity,
      allowSleep: false,
      args: boxSize,
      ...props,
    }),
    ref
  )
  return (
    <mesh ref={ref} api={api} castShadow>
      <boxBufferGeometry attach="geometry" args={boxSize} />
      <meshNormalMaterial attach="material" />
      <axesHelper scale={[5, 5, 5]} />
    </mesh>
  )
})

// A Wheel
const Wheel = forwardRef((props, ref) => {
  const wheelSize = [0.7, 0.7, 0.5, 16]
  useCylinder(
    () => ({
      mass: 1,
      type: 'Kinematic',
      material: 'wheel',
      collisionFilterGroup: 0, // turn off collisions !!
      // rotation: [0,0,Math.PI/2], // useless -> the rotation should be applied to the shape (not the body)
      args: wheelSize,
      ...props,
    }),
    ref
  )
  // useCompoundBody(
  //   () => ({
  //     mass: 1,
  //     type: 'Kinematic',
  //     material: 'wheel',
  //     collisionFilterGroup: 0, // turn off collisions
  //     ...props,
  //     shapes: [{ type: 'Cylinder', args: wheelSize, rotation: [Math.PI / 2, 0, 0] }],
  //   }),
  //   ref
  // )
  return (
    <mesh ref={ref}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderBufferGeometry attach="geometry" args={wheelSize} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </mesh>
  )
})

function Pilar(props) {
  const args = [0.7, 0.7, 5, 16]
  const [ref] = useCylinder(() => ({
    mass: 10,
    args: args,
    ...props,
  }))
  return (
    <mesh ref={ref} castShadow>
      <cylinderBufferGeometry attach="geometry" args={args} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

const wheelInfo = {
  radius: 0.7,
  directionLocal: [0, -1, 0], // same as Physics gravity
  suspensionStiffness: 30,
  suspensionRestLength: 0.3,
  maxSuspensionForce: 1e4,
  maxSuspensionTravel: 0.3,
  dampingRelaxation: 2.3,
  dampingCompression: 4.4,
  frictionSlip: 5,
  rollInfluence: 0.01,
  axleLocal: [1, 0, 0], // wheel rotates around X-axis
  chassisConnectionPointLocal: [1, 0, 1],
  isFrontWheel: false,
  useCustomSlidingRotationalSpeed: true,
  customSlidingRotationalSpeed: -30,
}

function Vehicle(props) {
  // chassisBody
  const chassis = useRef()
  // wheels
  const wheels = []
  const wheelInfos = []

  // chassis - wheel connection helpers
  var chassisWidth = 2
  var chassisHeight = 0
  var chassisFront = 1
  var chassisBack = -1

  // FrontLeft [-X,Y,Z]
  const wheel_1 = useRef()
  wheels.push(wheel_1)
  const wheelInfo_1 = { ...wheelInfo }
  wheelInfo_1.chassisConnectionPointLocal = [-chassisWidth / 2, chassisHeight, chassisFront]
  wheelInfo_1.isFrontWheel = true
  wheelInfos.push(wheelInfo_1)
  // FrontRight [X,Y,Z]
  const wheel_2 = useRef()
  wheels.push(wheel_2)
  const wheelInfo_2 = { ...wheelInfo }
  wheelInfo_2.chassisConnectionPointLocal = [chassisWidth / 2, chassisHeight, chassisFront]
  wheelInfo_2.isFrontWheel = true
  wheelInfos.push(wheelInfo_2)
  // BackLeft [-X,Y,-Z]
  const wheel_3 = useRef()
  wheels.push(wheel_3)
  const wheelInfo_3 = { ...wheelInfo }
  wheelInfo_3.chassisConnectionPointLocal = [-chassisWidth / 2, chassisHeight, chassisBack]
  wheelInfo_3.isFrontWheel = false
  wheelInfos.push(wheelInfo_3)
  // BackRight [X,Y,-Z]
  const wheel_4 = useRef()
  wheels.push(wheel_4)
  const wheelInfo_4 = { ...wheelInfo }
  wheelInfo_4.chassisConnectionPointLocal = [chassisWidth / 2, chassisHeight, chassisBack]
  wheelInfo_4.isFrontWheel = false
  wheelInfos.push(wheelInfo_4)

  const [vehicle, api] = useRaycastVehicle(() => ({
    chassisBody: chassis,
    wheels: wheels,
    wheelInfos: wheelInfos,
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }))

  const forward = useKeyPress('w')
  // const forward = useKeyPress('z')
  const backward = useKeyPress('s')
  const left = useKeyPress('a')
  // const left = useKeyPress('q')
  const right = useKeyPress('d')
  const brake = useKeyPress(' ') // space bar
  const reset = useKeyPress('r')

  const [steeringValue, setSteeringValue] = useState(0)
  const [engineForce, setEngineForce] = useState(0)
  const [brakeForce, setBrakeForce] = useState(0)

  var maxSteerVal = 0.5
  var maxForce = 1e3
  var maxBrakeForce = 1e5

  useFrame(() => {
    if (left && !right) {
      setSteeringValue(maxSteerVal)
    } else if (right && !left) {
      setSteeringValue(-maxSteerVal)
    } else {
      setSteeringValue(0)
    }
    if (forward && !backward) {
      setBrakeForce(0)
      setEngineForce(-maxForce)
    } else if (backward && !forward) {
      setBrakeForce(0)
      setEngineForce(maxForce)
    } else if (engineForce !== 0) {
      setEngineForce(0)
    }
    if (brake) {
      setBrakeForce(maxBrakeForce)
    }
    if (reset) {
      chassis.current.api.position.set(0, 5, 0)
      chassis.current.api.velocity.set(0, 0, 0)
      chassis.current.api.angularVelocity.set(0, 0.5, 0)
      chassis.current.api.rotation.set(0, -Math.PI / 4, 0)
    }
  })

  useEffect(() => {
    api.applyEngineForce(engineForce, 2)
    api.applyEngineForce(engineForce, 3)
  }, [engineForce])
  useEffect(() => {
    api.setSteeringValue(steeringValue, 0)
    api.setSteeringValue(steeringValue, 1)
  }, [steeringValue])
  useEffect(() => {
    api.setBrake(brakeForce, 0)
    api.setBrake(brakeForce, 1)
    api.setBrake(brakeForce, 2)
    api.setBrake(brakeForce, 3)
  }, [brakeForce])

  return (
    <group ref={vehicle}>
      <Chassis
        ref={chassis}
        rotation={props.rotation}
        position={props.position}
        angularVelocity={props.angularVelocity}></Chassis>
      <Wheel ref={wheel_1}></Wheel>
      <Wheel ref={wheel_2}></Wheel>
      <Wheel ref={wheel_3}></Wheel>
      <Wheel ref={wheel_4}></Wheel>
    </group>
  )
}

const defaultContactMaterial = {
  contactEquationRelaxation: 4,
  friction: 1e-3,
}

const VehicleScene = () => {
  return (
    <Canvas shadowMap camera={{ position: [0, 5, 20], fov: 50 }}>
      <CameraControls />
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <axesHelper scale={[10, 10, 10]} />
      <Physics
        gravity={[0, -10, 0]}
        allowSleep={true}
        broadphase="SAP"
        defaultContactMaterial={defaultContactMaterial}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Vehicle position={[0, 5, 0]} rotation={[0, -Math.PI / 4, 0]} angularVelocity={[0, 0.5, 0]} />
        <Pilar rotation={[0, 0, 0]} position={[-5, 2.5, -5]} />
        <Pilar rotation={[0, 0, 0]} position={[0, 2.5, -5]} />
        <Pilar rotation={[0, 0, 0]} position={[5, 2.5, -5]} />
        {/* <Pilar rotation={[0, 0, Math.PI/2]} position={[-2.5, 5.7, -5]} /> */}
        {/* <Pilar rotation={[0, 0, Math.PI/2]} position={[2.5, 5.7, -5]} /> */}
      </Physics>
    </Canvas>
  )
}

// useKeyPress Hook (credit: https://usehooks.com/useKeyPress/)
function useKeyPress(targetKey) {
  // State for keeping track of whether key is pressed
  const [keyPressed, setKeyPressed] = useState(false)

  // If pressed key is our target key then set to true
  function downHandler({ key }) {
    if (key === targetKey) {
      setKeyPressed(true)
    }
  }

  // If released key is our target key then set to false
  const upHandler = ({ key }) => {
    if (key === targetKey) {
      setKeyPressed(false)
    }
  }

  // Add event listeners
  useEffect(() => {
    window.addEventListener('keydown', downHandler)
    window.addEventListener('keyup', upHandler)
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, []) // Empty array ensures that effect is only run on mount and unmount

  return keyPressed
}

export default VehicleScene
