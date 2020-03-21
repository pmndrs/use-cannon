import * as THREE from 'three'
import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import {
  Physics,
  useBox,
  useSphere,
  usePlane,
  useConeTwistConstraint,
  usePointToPointConstraint,
} from 'use-cannon'
import { createRagdoll } from './createConfig'

const config = createRagdoll(5, Math.PI / 16, Math.PI / 16, 0)
const context = createContext()

// Component for limbs and body
const BodyPart = React.forwardRef(({ children, type, name, ...props }, ref) => {
  const { color, args, mass, position } = config.shapes[name]
  const [thisbody] = useBox(() => ({ ref, type, mass, args, position, linearDamping: 0.9 }))
  const sizes = useMemo(() => args.map(s => s * 2), [args])
  return (
    <context.Provider value={thisbody}>
      <mesh castShadow receiveShadow ref={thisbody} {...props} name={name}>
        <boxBufferGeometry attach="geometry" args={sizes} />
        <meshStandardMaterial attach="material" color={color} />
      </mesh>
      {children}
    </context.Provider>
  )
})

// A container that sets up a joint between the parent and child
const BodyPartConstraint = ({ config, cursor, ...props }) => {
  const parent = useContext(context)
  const [child] = useConeTwistConstraint(null, parent, config)
  const [, , { enable, disable }] = usePointToPointConstraint(cursor, child, {
    pivotA: [0, 0, 0],
    pivotB: [0, 0, 0],
  })
  useEffect(() => void disable(), [])
  const onPointerUp = useCallback(e => disable(), [])
  const onPointerDown = useCallback(e => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    enable()
  }, [])
  return (
    <BodyPart
      ref={child}
      {...props}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  )
}

// Base Ragdoll Component
const Ragdoll = React.forwardRef(({ ...props }, ref) => {
  const [cursor, api] = useSphere(() => ({ type: 'Static', args: [0.25], position: [0, 0, 10000] }))
  props = { ...props, cursor }

  const vector = new THREE.Vector3()
  useFrame(e => {
    vector.set(e.mouse.x, e.mouse.y, (e.camera.near + e.camera.far) / (e.camera.near - e.camera.far))
    vector.unproject(e.camera)
    //console.log(vector)

    api.position.set((e.mouse.x * e.viewport.height) / 25 / 2, (e.mouse.y * e.viewport.width) / 25 / 2, 0)
    //api.position.set(vector.x, vector.y, vector.z)
  })
  return (
    <BodyPartConstraint ref={ref} name={'upperBody'} {...props}>
      <mesh ref={cursor} />
      <BodyPartConstraint {...props} name={'head'} config={config.joints['neckJoint']} />
      <BodyPartConstraint {...props} name={'upperLeftArm'} config={config.joints['leftShoulder']}>
        <BodyPartConstraint {...props} name={'lowerLeftArm'} config={config.joints['leftElbowJoint']} />
      </BodyPartConstraint>
      <BodyPartConstraint {...props} name={'upperRightArm'} config={config.joints['rightShoulder']}>
        <BodyPartConstraint {...props} name={'lowerRightArm'} config={config.joints['rightElbowJoint']} />
      </BodyPartConstraint>
      <BodyPartConstraint {...props} name={'pelvis'} config={config.joints['spineJoint']}>
        <BodyPartConstraint {...props} name={'upperLeftLeg'} config={config.joints['leftHipJoint']}>
          <BodyPartConstraint {...props} name={'lowerLeftLeg'} config={config.joints['leftKneeJoint']} />
        </BodyPartConstraint>
        <BodyPartConstraint {...props} name={'upperRightLeg'} config={config.joints['rightHipJoint']}>
          <BodyPartConstraint {...props} name={'lowerRightLeg'} config={config.joints['rightKneeJoint']} />
        </BodyPartConstraint>
      </BodyPartConstraint>
    </BodyPartConstraint>
  )
})

function Plane(props) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[1000, 1000]} />
      <meshStandardMaterial attach="material" color="#171720" />
    </mesh>
  )
}

const Box = React.forwardRef((props, ref) => {
  return (
    <mesh receiveShadow castShadow ref={ref}>
      <boxBufferGeometry attach="geometry" />
      <meshStandardMaterial attach="material" />
    </mesh>
  )
})

function Chair() {
  const [back] = useBox(() => ({
    type: 'Static',
    position: [-5 + 0, 1.4, -1.8],
    scale: [4, 4, 0.5],
    args: [2, 2, 0.25],
  }))
  const [seat] = useBox(() => ({
    type: 'Static',
    position: [-5 + 0, -0.8, 0],
    scale: [4, 0.5, 4],
    args: [2, 0.25, 2],
  }))
  const [leg1] = useBox(() => ({
    type: 'Static',
    position: [-5 + -1.8, -3, 1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg2] = useBox(() => ({
    type: 'Static',
    position: [-5 + 1.8, -3, 1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg3] = useBox(() => ({
    type: 'Static',
    position: [-5 + -1.8, -3, -1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg4] = useBox(() => ({
    type: 'Static',
    position: [-5 + 1.8, -3, -1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  return (
    <>
      <Box ref={back} />
      <Box ref={seat} />
      <Box ref={leg1} />
      <Box ref={leg2} />
      <Box ref={leg3} />
      <Box ref={leg4} />
    </>
  )
}

function Table() {
  const [seat] = useBox(() => ({
    type: 'Static',
    position: [5 + 0, -0.8, 5 + 0],
    scale: [6, 0.5, 6],
    args: [3, 0.25, 3],
  }))
  const [leg1] = useBox(() => ({
    type: 'Static',
    position: [5 + -1.8, -3, 5 + 1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg2] = useBox(() => ({
    type: 'Static',
    position: [5 + 1.8, -3, 5 + 1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg3] = useBox(() => ({
    type: 'Static',
    position: [5 + -1.8, -3, 5 + -1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  const [leg4] = useBox(() => ({
    type: 'Static',
    position: [5 + 1.8, -3, 5 + -1.8],
    scale: [0.5, 4, 0.5],
    args: [0.25, 2, 0.25],
  }))
  return (
    <>
      <Box ref={seat} />
      <Box ref={leg1} />
      <Box ref={leg2} />
      <Box ref={leg3} />
      <Box ref={leg4} />
    </>
  )
}

export default () => (
  <Canvas
    concurrent
    sRGB
    shadowMap
    orthographic
    camera={{ position: [-15, 15, 25], zoom: 25, near: 1, far: 100 }}>
    <color attach="background" args={['#171720']} />
    <fog attach="fog" args={['#171720', 20, 60]} />
    <ambientLight intensity={0.2} />
    <pointLight position={[-10, -10, -10]} color="red" intensity={1} />
    <spotLight position={[30, 30, 30]} angle={0.3} penumbra={1} intensity={0.5} castShadow />
    <Physics gravity={[0, -100, 0]} allowSleep={false}>
      <Ragdoll position={[0, 0, 0]} />
      <Plane position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <Chair />
      <Table />
    </Physics>
  </Canvas>
)
