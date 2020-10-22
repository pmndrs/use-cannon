import React, { useEffect, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from 'react-three-fiber'
import { useCylinder } from 'use-cannon'
import { Physics, useBox, usePlane, useRaycastVehicle } from 'use-cannon'
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
  const [ref] = usePlane(() => ({ type: 'Static', ...props }))
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
const Chassis = React.forwardRef((props, ref) => {
  const boxSize = [3, 0.5, 1]
  const rotation = [(Math.PI * 3) / 2, 0, 0]
  const [_] = useBox(
    () => ({
      // type: 'Kinetic',
      mass: 5000,
      // rotation: rotation,
      ...props,
    }),
    ref
  )
  // console.log(_)
  return (
    <mesh ref={ref} castShadow>
      <boxBufferGeometry attach="geometry" args={boxSize} />
      <meshNormalMaterial attach="material" />
      <axesHelper scale={[5, 5, 5]} />
    </mesh>
  )
})

const wheelInfo = {
  radius: 0.7,
  directionLocal: [0, 0, 1],
  suspensionStiffness: 30,
  suspensionRestLength: 0.3,
  frictionSlip: 5,
  dampingRelaxation: 2.3,
  dampingCompression: 4.4,
  maxSuspensionForce: 1e5, // 10000
  rollInfluence: 0.01,
  axleLocal: [0, 1, 0],
  chassisConnectionPointLocal: [1, 1, 0],
  maxSuspensionTravel: 0.3,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: true,
}

// A Wheel
const Wheel = React.forwardRef((props, ref) => {
  const wheelSize = [0.7, 0.7, 0.5, 8]
  const [_] = useCylinder(
    () => ({
      // type: 'Kinematic',
      args: wheelSize,
      ...props,
    }),
    ref
  )
  // console.log(_)
  return (
    <mesh ref={ref} castShadow>
      <cylinderBufferGeometry attach="geometry" args={wheelSize} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
})

function Vehicle(props) {
  // chassisBody
  const chassis = useRef()
  const wheels = []
  const wheelInfos = []
  // FL
  const wheel_1 = useRef()
  wheels.push(wheel_1)
  const wheelInfo_1 = { ...wheelInfo }
  // wheelInfo_1.chassisConnectionPointLocal = [1, 0, 1]
  wheelInfo_1.chassisConnectionPointLocal = [1, 1, 0]
  wheelInfos.push(wheelInfo_1)
  // FR
  const wheel_2 = useRef()
  wheels.push(wheel_2)
  const wheelInfo_2 = { ...wheelInfo }
  // wheelInfo_2.chassisConnectionPointLocal = [1, 0, -1]
  wheelInfo_2.chassisConnectionPointLocal = [1, -1, 0]
  wheelInfos.push(wheelInfo_2)
  // BL
  const wheel_3 = useRef()
  wheels.push(wheel_3)
  const wheelInfo_3 = { ...wheelInfo }
  // wheelInfo_3.chassisConnectionPointLocal = [-1, 0, 1]
  wheelInfo_3.chassisConnectionPointLocal = [-1, 1, 0]
  wheelInfos.push(wheelInfo_3)
  // BR
  const wheel_4 = useRef()
  wheels.push(wheel_4)
  const wheelInfo_4 = { ...wheelInfo }
  // wheelInfo_4.chassisConnectionPointLocal = [-1, 0, -1]
  wheelInfo_4.chassisConnectionPointLocal = [-1, -1, 0]
  wheelInfos.push(wheelInfo_4)

  const [ref, api] = useRaycastVehicle(() => ({
    chassisBody: chassis,
    wheels: wheels,
    wheelInfos: wheelInfos,
    indexForwardAxis: 0,
    indexRightAxis: 1,
    indexUpAxis: 2,
    // indexForwardAxis: 1,
    // indexRightAxis: 0,
    // indexUpAxis: 2,
    // indexForwardAxis: 0,
    // indexRightAxis: 2,
    // indexUpAxis: 1,
    // indexForwardAxis: 2,
    // indexRightAxis: 0,
    // indexUpAxis: 1,
  }))

  const forward = useKeyPress('z')
  const backward = useKeyPress('s')
  const left = useKeyPress('q')
  const right = useKeyPress('d')
  const brake = useKeyPress(' ') // space bar

  const [steeringValue, setSteeringValue] = useState(0)
  // const [engineForce, applyEngineForce] = useState(0)
  const [brakeForce, setBrakeForce] = useState(false)

  var maxSteerVal = 0.5
  var maxForce = 1e3
  var maxBrakeForce = 1e6

  useFrame(() => {
    if (left && !right) {
      setSteeringValue(-maxSteerVal)
    } else if (right && !left) {
      setSteeringValue(maxSteerVal)
    } else {
      setSteeringValue(0)
    }
    if (forward && !backward) {
      // api.setBrake(0, 0)
      // api.setBrake(0, 1)
      // api.setBrake(0, 2)
      // api.setBrake(0, 3)
      api.applyEngineForce(maxForce, 2)
      api.applyEngineForce(maxForce, 3)
    } else if (backward && !forward) {
      // api.setBrake(0, 0)
      // api.setBrake(0, 1)
      // api.setBrake(0, 2)
      // api.setBrake(0, 3)
      api.applyEngineForce(-maxForce, 2)
      api.applyEngineForce(-maxForce, 3)
    }
    if (brake) {
      setBrakeForce(maxBrakeForce)
    } else {
      setBrakeForce(0)
    }
  })

  useEffect(() => {
    api.setSteeringValue(steeringValue, 0)
    api.setSteeringValue(steeringValue, 1)
  }, [steeringValue])
  // useEffect(() => {
  //   api.applyEngineForce(engineForce, 2)
  //   api.applyEngineForce(engineForce, 3)
  // }, [engineForce])
  useEffect(() => {
    api.setBrake(brakeForce, 0)
    api.setBrake(brakeForce, 1)
    api.setBrake(brakeForce, 2)
    api.setBrake(brakeForce, 3)
  }, [brakeForce])

  return (
    <group ref={ref}>
      {/* <group> */}
      {/* rotation={[Math.PI*1/2,0,0]} */}
      <Chassis rotation={[(Math.PI * 1) / 2, 0, 0]} position={props.position} ref={chassis}></Chassis>
      <Wheel ref={wheel_1}></Wheel>
      <Wheel ref={wheel_2}></Wheel>
      <Wheel ref={wheel_3}></Wheel>
      <Wheel ref={wheel_4}></Wheel>
    </group>
  )
}

const VehicleScene = () => {
  return (
    <Canvas shadowMap sRGB camera={{ position: [0, 5, 20], fov: 50 }}>
      <CameraControls />
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <axesHelper scale={[10, 10, 10]} />
      <Physics gravity={[0, -10, 0]} allowSleep={true} broadphase={'SAP'}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Vehicle position={[0, 5, 0]} />
      </Physics>
    </Canvas>
  )
}

// Hook
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
