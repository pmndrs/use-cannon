import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useBox, useRaycastVehicle } from '@react-three/cannon'
import { Chassis } from './Chassis'
import { Wheel } from './Wheel'

import type { BoxProps, WheelInfoOptions } from '@react-three/cannon'
import type { Object3D } from 'three'

export type VehicleProps = Pick<BoxProps, 'angularVelocity' | 'position' | 'rotation'> & {
  radius?: number
  width?: number
  height?: number
  front?: number
  back?: number
  steer?: number
  force?: number
  maxBrake?: number
}

function Vehicle({
  angularVelocity,
  position,
  radius = 0.7,
  rotation,
  width = 1.2,
  height = -0.04,
  front = 1.3,
  back = -1.15,
  steer = 0.5,
  force = 1500,
  maxBrake = 50,
}: VehicleProps) {
  const chassisBody = useRef<Object3D>(null)
  const wheels = [
    useRef<Object3D>(null),
    useRef<Object3D>(null),
    useRef<Object3D>(null),
    useRef<Object3D>(null),
  ]

  const controls = useControls()

  const wheelInfo: WheelInfoOptions = {
    radius,
    directionLocal: [0, -1, 0], // set to same as Physics Gravity
    suspensionStiffness: 30,
    suspensionRestLength: 0.3,
    maxSuspensionForce: 1e4,
    maxSuspensionTravel: 0.3,
    dampingRelaxation: 10,
    dampingCompression: 4.4,
    axleLocal: [-1, 0, 0], // This is inverted for asymmetrical wheel models (left v. right sided)
    chassisConnectionPointLocal: [1, 0, 1],
    useCustomSlidingRotationalSpeed: true,
    customSlidingRotationalSpeed: -30,
    frictionSlip: 2,
  }

  const wheelInfo1: WheelInfoOptions = {
    ...wheelInfo,
    isFrontWheel: true,
    chassisConnectionPointLocal: [-width / 2, height, front],
  }
  const wheelInfo2: WheelInfoOptions = {
    ...wheelInfo,
    isFrontWheel: true,
    chassisConnectionPointLocal: [width / 2, height, front],
  }
  const wheelInfo3: WheelInfoOptions = {
    ...wheelInfo,
    isFrontWheel: false,
    chassisConnectionPointLocal: [-width / 2, height, back],
  }
  const wheelInfo4: WheelInfoOptions = {
    ...wheelInfo,
    isFrontWheel: false,
    chassisConnectionPointLocal: [width / 2, height, back],
  }

  const [, chassisApi] = useBox(
    () => ({
      allowSleep: false,
      angularVelocity,
      args: [1.7, 1, 4],
      mass: 500,
      onCollide: (e) => console.log('bonk', e.body.userData),
      position,
      rotation,
    }),
    chassisBody,
  )

  const [vehicle, vehicleApi] = useRaycastVehicle(() => ({
    chassisBody,
    wheels,
    wheelInfos: [wheelInfo1, wheelInfo2, wheelInfo3, wheelInfo4],
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }))

  useEffect(() => vehicleApi.sliding.subscribe((v) => console.log('sliding', v)), [])

  useFrame(() => {
    const { forward, backward, left, right, brake, reset } = controls.current

    for (let e = 2; e < 4; e++) {
      vehicleApi.applyEngineForce(forward || backward ? force * (forward && !backward ? -1 : 1) : 0, 2)
    }

    for (let s = 0; s < 2; s++) {
      vehicleApi.setSteeringValue(left || right ? steer * (left && !right ? 1 : -1) : 0, s)
    }

    for (let b = 2; b < 4; b++) {
      vehicleApi.setBrake(brake ? maxBrake : 0, b)
    }

    if (reset) {
      chassisApi.position.set(0, 0.5, 0)
      chassisApi.velocity.set(0, 0, 0)
      chassisApi.angularVelocity.set(0, 0.5, 0)
      chassisApi.rotation.set(0, -Math.PI / 4, 0)
    }
  })

  return (
    <group ref={vehicle} position={[0, -0.4, 0]}>
      <Chassis ref={chassisBody} />
      <Wheel ref={wheels[0]} radius={radius} leftSide />
      <Wheel ref={wheels[1]} radius={radius} />
      <Wheel ref={wheels[2]} radius={radius} leftSide />
      <Wheel ref={wheels[3]} radius={radius} />
    </group>
  )
}

export default Vehicle

export function useKeyPress(target: string[], event: (pressed: boolean) => void) {
  useEffect(() => {
    const downHandler = ({ key }: KeyboardEvent) => target.indexOf(key) !== -1 && event(true)
    const upHandler = ({ key }: KeyboardEvent) => target.indexOf(key) !== -1 && event(false)
    window.addEventListener('keydown', downHandler)
    window.addEventListener('keyup', upHandler)
    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [])
}

export function useControls() {
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
  })
  useKeyPress(['ArrowUp', 'w'], (pressed) => (keys.current.forward = pressed))
  useKeyPress(['ArrowDown', 's'], (pressed) => (keys.current.backward = pressed))
  useKeyPress(['ArrowLeft', 'a'], (pressed) => (keys.current.left = pressed))
  useKeyPress(['ArrowRight', 'd'], (pressed) => (keys.current.right = pressed))
  useKeyPress([' '], (pressed) => (keys.current.brake = pressed))
  useKeyPress(['r'], (pressed) => (keys.current.reset = pressed))
  return keys
}
