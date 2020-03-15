import * as THREE from 'three'
import React, { useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import {
  Physics,
  useSphere,
  useBox,
  useSpring,
  useDistanceConstraint,
  useConeTwistConstraint,
} from '../../../dist/index'
import lerp from 'lerp'
import create from 'zustand'
import mergeRefs from 'react-merge-refs'

const ragdollShapeConfigs = createRagdoll(3)
const ragdollJointConfigs = createRagdollJoints()

const [useStore] = create(set => ({
  bodies: [],
  addBody: (name, args, ref, api) => set(({ bodies }) => ({ bodies: [...bodies, { name, args, ref, api }] })),
  removeBody: name => set(({ bodies }) => ({ bodies: bodies.filter(body => body.name != name) })),
}))

// const Cursor = ({ grabRef, ...props }) => {
//   const [ref, api] = useSphere(() => ({ type: 'Kinematic', mass: 1, args: 0.5, position: [1, 0, 0] }))
//   const [toggle, setToggle] = useState(true)
//   const { enable, disable } = useDistanceConstraint(ref, grabRef, { distance: 3 }, [grabRef, ref])

//   useFrame(e => {
//     api.setPosition((e.mouse.x * e.viewport.width) / 2, (e.mouse.y * e.viewport.height) / 2, 0)
//   })

//   return (
//     <mesh
//       ref={ref}
//       {...props}
//       onClick={() => {
//         if (!toggle) {
//           enable()
//           setToggle(true)
//         } else {
//           disable()
//           setToggle(false)
//         }
//       }}>
//       <sphereBufferGeometry attach="geometry" args={[0.25, 64, 64]}></sphereBufferGeometry>
//       <meshStandardMaterial attach="material" />
//     </mesh>
//   )
// }

const Ragdoll = props => {
  const { bodies } = useStore()

  ragdollJointConfigs.map(({ bodyA, bodyB, ...options }) => {
    const bodyRefA = bodies.filter(({ name }) => name == bodyA)[0].ref
    const bodyRefB = bodies.filter(({ name }) => name == bodyB)[0].ref
    return useConeTwistConstraint(bodyRefA, bodyRefB, options)
  })

  const neckJoint = useConeTwistConstraint(),
    leftKneeJoint = useConeTwistConstraint(),
    rightKneeJoint = useConeTwistConstraint(),
    leftHipJoint = useConeTwistConstraint(),
    rightHipJoint = useConeTwistConstraint(),
    spineJoint = useConeTwistConstraint(),
    leftShoulder = useConeTwistConstraint(),
    rightShoulder = useConeTwistConstraint(),
    leftElbowJoint = useConeTwistConstraint(),
    rightElbowJoint = useConeTwistConstraint()

  return (
    <mesh dispose={null} {...props}>
      {/* {Object.keys(ragdollShapeConfigs).map(props => (
        <Box {...props} />
      ))} */}

      <Box {...ragdollShapeConfigs['head']} />
      <Box {...ragdollShapeConfigs['upperBody']} />
      <Box {...ragdollShapeConfigs['upperLeftArm']} />
      <Box {...ragdollShapeConfigs['upperRightArm']} />
      <Box {...ragdollShapeConfigs['lowerLeftArm']} />
      <Box {...ragdollShapeConfigs['lowerRightArm']} />
      <Box {...ragdollShapeConfigs['pelvis']} />
      <Box {...ragdollShapeConfigs['lowerLeftLeg']} />
      <Box {...ragdollShapeConfigs['lowerRightLeg']} />
      <Box {...ragdollShapeConfigs['upperLeftLeg']} />
      <Box {...ragdollShapeConfigs['upperRightLeg']} />
    </mesh>
  )
}

const Box = ({ name, args, mass, position, ...props }) => {
  const [ref, api] = useBox(() => ({ args, mass, position }))

  const { addBody, removeBody } = useStore()

  useEffect(() => {
    addBody({ name: name, ref, api, args })
    return () => removeBody(name)
  }, [ref])

  return (
    <mesh ref={ref} {...props} position={position}>
      <boxBufferGeometry attach="geometry" args={args}></boxBufferGeometry>
      <meshStandardMaterial attach="material" />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[5, 5]} />
      <shadowMaterial attach="material" color="#171717" />
    </mesh>
  )
}

const RagdollScene = () => {
  return (
    <Canvas shadowMap sRGB camera={{ position: [0, 5, 20], fov: 50 }}>
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[-10, -10, -10]} />
      <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
      <Physics gravity={[0, -40, 0]} allowSleep={false}>
        {/* <Cursor api={ballApi} ref={ball} position={[-1, 0, 0]}></Cursor> */}
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Ragdoll position={[0, 10, 0]} />
      </Physics>
    </Canvas>
  )
}

export default RagdollScene

function createRagdoll(scale) {
  var shouldersDistance = 0.5 * scale,
    upperArmLength = 0.4 * scale,
    lowerArmLength = 0.4 * scale,
    upperArmSize = 0.2 * scale,
    lowerArmSize = 0.2 * scale,
    neckLength = 0.1 * scale,
    headRadius = 0.25 * scale,
    upperBodyLength = 0.6 * scale,
    pelvisLength = 0.4 * scale,
    upperLegLength = 0.5 * scale,
    upperLegSize = 0.2 * scale,
    lowerLegSize = 0.2 * scale,
    lowerLegLength = 0.5 * scale

  // Lower legs
  var lowerLeftLeg = {
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [-shouldersDistance / 2, lowerLegLength / 2, 0],
  }
  var lowerRightLeg = {
    args: [lowerLegSize * 0.5, lowerLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [shouldersDistance / 2, lowerLegLength / 2, 0],
  }

  // Upper legs
  var upperLeftLeg = {
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [-shouldersDistance / 2, lowerLeftLeg.position.y + lowerLegLength / 2 + upperLegLength / 2, 0],
  }
  var upperRightLeg = {
    args: [upperLegSize * 0.5, upperLegLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [shouldersDistance / 2, lowerRightLeg.position.y + lowerLegLength / 2 + upperLegLength / 2, 0],
  }

  // Pelvis
  var pelvis = {
    args: [shouldersDistance * 0.5, pelvisLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [0, upperLeftLeg.position.y + upperLegLength / 2 + pelvisLength / 2, 0],
  }

  // Upper body
  var upperBody = {
    args: [shouldersDistance * 0.5, upperBodyLength * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [0, pelvis.position.y + pelvisLength / 2 + upperBodyLength / 2, 0],
  }

  // Head
  var head = {
    args: [headRadius * 0.5, headRadius * 0.5, headRadius * 0.5],
    mass: 1,
    position: [0, upperBody.position.y + upperBodyLength / 2 + headRadius + neckLength, 0],
  }

  // Upper arms
  var upperLeftArm = {
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: 1,
    position: [-shouldersDistance / 2 - upperArmLength / 2, upperBody.position.y + upperBodyLength / 2, 0],
  }
  var upperRightArm = {
    args: [upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5],
    mass: 1,
    position: [shouldersDistance / 2 + upperArmLength / 2, upperBody.position.y + upperBodyLength / 2, 0],
  }

  // lower arms
  var lowerLeftArm = {
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [upperLeftArm.position.x - lowerArmLength / 2 - upperArmLength / 2, upperLeftArm.position.y, 0],
  }
  var lowerRightArm = {
    args: [lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5],
    mass: 1,
    position: [
      upperRightArm.position.x + lowerArmLength / 2 + upperArmLength / 2,
      upperRightArm.position.y,
      0,
    ],
  }

  return {
    lowerLeftLeg,
    lowerRightLeg,
    upperLeftLeg,
    upperRightLeg,
    pelvis,
    upperBody,
    head,
    upperLeftArm,
    upperRightArm,
    lowerLeftArm,
    lowerRightArm,
  }
}

function createRagdollJoints(angleA = 0, angleB = 0, twistAngle = 0) {
  // Neck joint
  var neckJoint = {
    bodyA: 'head',
    bodyB: 'upperBody',
    pivotA: [0, -headRadius - neckLength / 2, 0],
    pivotB: [0, upperBodyLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Knee joints
  var leftKneeJoint = {
    bodyA: 'lowerLeftLeg',
    bodyB: 'upperLeftLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightKneeJoint = {
    bodyA: 'lowerRightLeg',
    bodyB: 'upperRightLeg',
    pivotA: [0, lowerLegLength / 2, 0],
    pivotB: [0, -upperLegLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Hip joints
  var leftHipJoint = {
    bodyA: 'upperLeftLeg',
    bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [-shouldersDistance / 2, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightHipJoint = {
    bodyA: 'upperRightLeg',
    bodyB: 'pelvis',
    pivotA: [0, upperLegLength / 2, 0],
    pivotB: [shouldersDistance / 2, -pelvisLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Spine
  var spineJoint = {
    bodyA: 'pelvis',
    bodyB: 'upperBody',
    pivotA: [0, pelvisLength / 2, 0],
    pivotB: [0, -upperBodyLength / 2, 0],
    axisA: [0, 1, 0],
    axisB: [0, 1, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  // Shoulders
  var leftShoulder = {
    bodyA: 'upperBody',
    bodyB: 'upperLeftArm',
    pivotA: [-shouldersDistance / 2, upperBodyLength / 2, 0],
    pivotB: [upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
  }
  var rightShoulder = {
    bodyA: 'upperBody',
    bodyB: 'upperRightArm',
    pivotA: [shouldersDistance / 2, upperBodyLength / 2, 0],
    pivotB: [-upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleB,
    twistAngle: twistAngle,
  }

  // Elbow joint
  var leftElbowJoint = {
    bodyA: 'lowerLeftArm',
    bodyB: 'upperLeftArm',
    pivotA: [lowerArmLength / 2, 0, 0],
    pivotB: [-upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }
  var rightElbowJoint = {
    bodyA: 'lowerRightArm',
    bodyB: 'upperRightArm',
    pivotA: [-lowerArmLength / 2, 0, 0],
    pivotB: [upperArmLength / 2, 0, 0],
    axisA: [1, 0, 0],
    axisB: [1, 0, 0],
    angle: angleA,
    twistAngle: twistAngle,
  }

  return {
    neckJoint,
    leftKneeJoint,
    rightKneeJoint,
    leftHipJoint,
    rightHipJoint,
    spineJoint,
    leftShoulder,
    rightShoulder,
    leftElbowJoint,
    rightElbowJoint,
  }
}
