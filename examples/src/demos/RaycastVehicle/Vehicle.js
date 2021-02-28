import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from 'react-three-fiber'
import { useRaycastVehicle } from '@react-three/cannon'

import Chassis from './Chassis'
import Wheel from './Wheel'

export default function Vehicle(props) {
  // chassisBody
  const chassis = useRef()
  // wheels
  const wheels = []
  const wheelInfos = []

  // chassis - wheel connection helpers
  const chassisWidth = 1.2
  const chassisHeight = -0.04 // ground clearance
  const chassisFront = 1.3
  const chassisBack = -1.15

  const wheelInfo = {
    radius: props.wheelRadius || 0.7,
    directionLocal: [0, -1, 0], // same as Physics gravity
    suspensionStiffness: 30,
    suspensionRestLength: 0.3,
    maxSuspensionForce: 1e4,
    maxSuspensionTravel: 0.3,
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    frictionSlip: 5,
    rollInfluence: 0.01,
    axleLocal: [-1, 0, 0], // wheel rotates around X-axis, invert if wheels rotate the wrong way
    chassisConnectionPointLocal: [1, 0, 1],
    isFrontWheel: false,
    useCustomSlidingRotationalSpeed: true,
    customSlidingRotationalSpeed: -30,
  }

  // FrontLeft [-X,Y,Z]
  const wheel_1 = useRef()
  const wheelInfo_1 = { ...wheelInfo }
  wheelInfo_1.chassisConnectionPointLocal = [-chassisWidth / 2, chassisHeight, chassisFront]
  wheelInfo_1.isFrontWheel = true

  // FrontRight [X,Y,Z]
  const wheel_2 = useRef()
  const wheelInfo_2 = { ...wheelInfo }
  wheelInfo_2.chassisConnectionPointLocal = [chassisWidth / 2, chassisHeight, chassisFront]
  wheelInfo_2.isFrontWheel = true

  // BackLeft [-X,Y,-Z]
  const wheel_3 = useRef()
  const wheelInfo_3 = { ...wheelInfo }
  wheelInfo_3.isFrontWheel = false
  wheelInfo_3.chassisConnectionPointLocal = [-chassisWidth / 2, chassisHeight, chassisBack]

  // BackRight [X,Y,-Z]
  const wheel_4 = useRef()
  const wheelInfo_4 = { ...wheelInfo }
  wheelInfo_4.chassisConnectionPointLocal = [chassisWidth / 2, chassisHeight, chassisBack]
  wheelInfo_4.isFrontWheel = false

  wheels.push(wheel_1, wheel_2, wheel_3, wheel_4)
  wheelInfos.push(wheelInfo_1, wheelInfo_2, wheelInfo_3, wheelInfo_4)

  const [vehicle, api] = useRaycastVehicle(() => ({
    chassisBody: chassis,
    wheels,
    wheelInfos,
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }))

  const forward = useKeyPress('w')
  const backward = useKeyPress('s')
  const left = useKeyPress('a')
  const right = useKeyPress('d')
  const brake = useKeyPress(' ') // space bar
  const reset = useKeyPress('r')

  const [steeringValue, setSteeringValue] = useState(0)
  const [engineForce, setEngineForce] = useState(0)
  const [brakeForce, setBrakeForce] = useState(0)

  const maxSteerVal = 0.5
  const maxForce = 1e3
  const maxBrakeForce = 1e5

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
    if (!brake) setBrakeForce(0)
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
    wheels.forEach((_, i) => api.setBrake(brakeForce, i))
  }, [brakeForce])

  return (
    <group ref={vehicle}>
      <Chassis
        ref={chassis}
        rotation={props.rotation}
        position={props.position}
        angularVelocity={props.angularVelocity}
      />
      <Wheel ref={wheel_1} size={props.wheelRadius || 0.7} leftSide />
      <Wheel ref={wheel_2} size={props.wheelRadius || 0.7} />
      <Wheel ref={wheel_3} size={props.wheelRadius || 0.7} leftSide />
      <Wheel ref={wheel_4} size={props.wheelRadius || 0.7} />
    </group>
  )
}

function useKeyPress(target) {
  const [keyPressed, setKeyPressed] = useState(false)

  // If pressed key is our target key then set to true
  const downHandler = ({ key }) => (key === target ? setKeyPressed(true) : null)
  const upHandler = ({ key }) => (key === target ? setKeyPressed(false) : null)

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
